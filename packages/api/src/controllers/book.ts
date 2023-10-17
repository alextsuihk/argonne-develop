/**
 * Controller: Books
 *
 */

import type { BookSchema } from '@argonne/common';
import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { FilterQuery, Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import type { BookAssignmentDocument, BookDocument } from '../models/book';
import Book, { BookAssignment, searchableFields } from '../models/book';
import type { ChatGroupDocument } from '../models/chat-group';
import ChatGroup from '../models/chat-group';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import type { ContributionDocument } from '../models/contribution';
import Contribution from '../models/contribution';
import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import type { PublisherDocument } from '../models/publisher';
import Publisher from '../models/publisher';
import Subject from '../models/subject';
import User from '../models/user';
import { messageToAdmins } from '../utils/chat';
import { mongoId } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { syncToAllSatellites } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';
import { signContentIds } from './content';
import { sanitizeContributors } from './contribution';

type Action =
  | 'addAssignment'
  | 'addRemark'
  | 'addRevision'
  | 'addRevisionImage'
  | 'addSupplement'
  | 'removeAssignment'
  | 'removeRevision'
  | 'removeRevisionImage'
  | 'removeSupplement';

type Populate = {
  assignments: (Omit<BookAssignmentDocument, 'contribution'> & { contribution: ContributionDocument })[];
  supplements: (Omit<BookDocument['supplements'], 'contribution'> & { contribution: ContributionDocument })[];
};
type PopulatedBook = Omit<BookDocument, 'assignments' | 'supplements'> & Populate;
export type BookDocumentEx = PopulatedBook & { contentsToken: string }; // export for JEST

const { MSG_ENUM } = LOCALE;
const { CHAT_GROUP, CONTRIBUTION, USER } = LOCALE.DB_ENUM;
const { config } = configLoader;
const { assertUnreachable, auth, DELETED, hubModeOnly, isAdmin, isTeacher, paginateSort, searchFilter, select } =
  common;
const {
  bookAssignmentSchema,
  bookIsbnSchema,
  bookRevisionSchema,
  bookSupplementSchema,
  bookSchema,
  idSchema,
  querySchema,
  remarkSchema,
  removeSchema,
  subIdSchema,
  urlSchema,
} = yupSchema;

const adminSelect = select([USER.ROLE.ADMIN]);

// nested populate
const populate = [
  { path: 'assignments', select: adminSelect, populate: [{ path: 'contribution', select: adminSelect }] },
  { path: 'supplements.contribution', select: adminSelect },
];

/**
 * only publisher.admin or admin have permission to proceed
 */
const checkPermission = async (
  id: string,
  userId: Types.ObjectId,
  isAdmin: boolean,
  extraFilter: FilterQuery<BookDocument> = {},
) => {
  const book = await Book.findOne({ _id: id, deletedAt: { $exists: false }, ...extraFilter }).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const publisher = await Publisher.findById(book.publisher).lean();
  if (!publisher) throw { statusCode: 400, code: MSG_ENUM.USER_INPUT_ERROR };

  if (isAdmin || (userId && publisher.admins.some(a => a.equals(userId)))) return { book, publisher };
  throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
};

/**
 * (helper) hide solutions (to general students), hide remark, and generate contentsToken
 */
const transform = async (
  userId: Types.ObjectId | null,
  userRoles: string[],
  book: PopulatedBook,
  publishers: PublisherDocument[],
  isTeacher = true,
): Promise<BookDocumentEx> => {
  const isPublisherAdmin =
    !!userId &&
    !!publishers.find(publisher => publisher._id.equals(book.publisher))?.admins.some(admin => admin.equals(userId));

  const hideRemark = !isAdmin(userRoles) && !isPublisherAdmin;

  // optionally hide solutions
  // assignment as (BookAssignmentDocument)[]
  const assignments = book.assignments.map(assignment => ({
    ...assignment,
    ...(hideRemark && { remarks: [] }),
    ...(!isAdmin(userRoles) && !isPublisherAdmin && !isTeacher && { solutions: [] }),
    contribution: { ...assignment.contribution, ...(!isAdmin(userRoles) && { remarks: [] }) },
  }));

  return {
    ...book,
    ...(hideRemark && { remarks: [] }),
    assignments,
    supplements: book.supplements.map(supplement => ({
      ...supplement,
      contribution: { ...supplement.contribution, ...(!isAdmin(userRoles) && { remarks: [] }) },
    })),
    contentsToken: await signContentIds(
      userId,
      assignments.map(assignment => [assignment.content, ...assignment.examples]).flat(),
    ),
  };
};

/**
 * (helper) validate user inputFields
 */
const validateInputs = async ({ book }: BookSchema) => {
  const [level, publisher, subjects] = await Promise.all([
    Level.exists({ _id: book.level, deletedAt: { $exists: false } }),
    Publisher.findOne({ _id: book.publisher, deletedAt: { $exists: false } }).lean(),
    Subject.find({ _id: { $in: book.subjects }, levels: book.level, deletedAt: { $exists: false } }, '_id').lean(),
  ]);

  if (!level || !publisher || book.subjects.length !== subjects.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return { level: level._id, publisher: publisher, subjects: subjects.map(s => s._id) };
};

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req);
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const { publisher } = await checkPermission(id, userId, isAdmin(userRoles));

  const book = await Book.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: adminSelect, new: true },
  )
    .populate<Populate>(populate)
    .lean();
  if (book) {
    const [transformed] = await Promise.all([
      transform(userId, userRoles, book, [publisher]),
      DatabaseEvent.log(userId, `/books/${id}`, 'REMARK', { args }),
    ]);
    return transformed;
  }
  log('error', 'bookController:addRemark()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { book: inputFields } = await bookSchema.validate(args);

  const { level, publisher, subjects } = await validateInputs({ book: inputFields });

  if (!isAdmin(userRoles) && !publisher.admins.some(admin => admin.equals(userId)))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const book = new Book<Partial<BookDocument>>({ ...inputFields, publisher: publisher._id, level, subjects });
  const { _id, title } = book;

  const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
    flags: [CHAT_GROUP.FLAG.BOOK],
    title: `Book (${_id}) ${title} Discussion Group`,
    membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
    users: publisher.admins,
    admins: publisher.admins,
    key: `BOOK#${_id}`,
  });
  book.chatGroup = chatGroup._id;

  const common = `${book.title} [/books/${_id}]`;
  const msg = {
    enUS: `A new book is added: ${common}.`,
    zhCN: `刚新增教科书：${common}。`,
    zhHK: `剛新增教科書：${common}。`,
  };

  const [transformed] = await Promise.all([
    transform(userId, userRoles, book.toObject(), [publisher]),
    book.save(),
    chatGroup.save(),
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${book._id}`),
    DatabaseEvent.log(userId, `/books/${_id}`, 'CREATE', { args }),
    syncToAllSatellites({
      bulkWrite: { books: [{ insertOne: { document: book } }] satisfies BulkWrite<BookDocument> },
    }),
  ]);

  return transformed;
};

/**
 * Create (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { book: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<BookDocumentEx[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<BookDocument>(searchableFields, { query });

  const { userId, userExtra, userRoles } = req;
  const [books, publishers, isActiveTeacher] = await Promise.all([
    Book.find(filter, adminSelect).populate<Populate>(populate).lean(),
    userId ? Publisher.find({ admins: userId }).lean() : [],
    isTeacher(userExtra),
  ]);

  return Promise.all(
    books.map(async book => transform(userId ?? null, userRoles ?? [], book, publishers, isActiveTeacher)),
  );
};

/**
 * Find Multiple with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<BookDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { title: 1 });

    const { userId, userExtra, userRoles } = req;
    const [total, books, publishers, isActiveTeacher] = await Promise.all([
      Book.countDocuments(filter),
      Book.find(filter, adminSelect, options).populate<Populate>(populate).lean(),
      userId ? Publisher.find({ admins: userId }).lean() : [],
      isTeacher(userExtra),
    ]);
    res.status(200).json({
      meta: { total, ...options },
      data: await Promise.all(
        books.map(async book => transform(userId ?? null, userRoles ?? [], book, publishers, isActiveTeacher)),
      ),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One by ID
 */
const findOne = async (req: Request, args: unknown): Promise<BookDocumentEx | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);
  const filter = searchFilter<BookDocument>([], { query }, { _id: id });

  const { userId, userExtra, userRoles } = req;
  const [book, publishers, isActiveTeacher] = await Promise.all([
    Book.findOne(filter, adminSelect).populate<Populate>(populate).lean(),
    userId ? Publisher.find({ admins: userId }).lean() : [],
    isTeacher(userExtra),
  ]);

  return book && transform(userId || null, userRoles ?? [], book, publishers, isActiveTeacher);
};

/**
 * Find One by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const book = await findOne(req, { id: req.params.id });
    book ? res.status(200).json({ data: book }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * is ISBN available
 */
const isIsbnAvailable = async (req: Request, args: unknown): Promise<boolean> => {
  const { isbn } = await bookIsbnSchema.validate(args);
  const isIsbnTaken = await Book.exists({ 'revisions.isbn': isbn });
  return !isIsbnTaken;
};

/**
 * Delete by ID
 * ! ONLY admin could remove book (ont even publisher)
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN'); // ONLY admin could remove book
  const { id, remark } = await removeSchema.validate(args);
  const { book: original, publisher } = await checkPermission(id, userId, isAdmin(userRoles));

  const common = `${original.title} [/books/${id}]`;
  const msg = {
    enUS: `A book is removed: ${common}.`,
    zhCN: `刚删除教科书：${common}。`,
    zhHK: `剛刪除教科書：${common}。`,
  };

  // const bookRevisionsImageUrls = original.revisions.map(rev => rev.imageUrls).flat();
  await Promise.all([
    Book.updateOne(
      { _id: id, deletedAt: { $exists: false } },
      { deletedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
    ),
    // ...bookRevisionsImageUrls.map(async url => storage.removeObject(url)), // remove all revision images
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'DELETE', { args, original }),
    syncToAllSatellites({
      bulkWrite: {
        books: [
          { updateOne: { filter: { _id: id }, update: { deletedAt: new Date() } } },
        ] satisfies BulkWrite<BookDocument>,
      },
      // minio: { serverUrl: config.server.minio.serverUrl, removeObjects: bookRevisionsImageUrls },
    }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete by ID (RESTful)
 */
const removeById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    res.status(200).json(await remove(req, { id: req.params.id, ...req.body }));
  } catch (error) {
    next(error);
  }
};

/**
 * Update Book
 */
const update = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, book: inputFields } = await bookSchema.concat(idSchema).validate(args);

  const [{ book: original, publisher }, { level, subjects }] = await Promise.all([
    checkPermission(id, userId, isAdmin(userRoles)),
    validateInputs({ book: inputFields }),
  ]);
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  //! not allow to change publisher
  if (!original.publisher.equals(inputFields.publisher)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `${inputFields.title} [/books/${id}]`;
  const msg = {
    enUS: `A book is updated: ${common}.`,
    zhCN: `刚更新教科书：${common}。`,
    zhHK: `剛更新教科書：${common}。`,
  };
  const update: UpdateQuery<BookDocument> = {
    ...inputFields,
    publisher: original.publisher, // override, not allow to change publisher
    level,
    subjects,
    ...(inputFields.subTitle ? { subTitle: inputFields.subTitle } : { $unset: { subTitle: 1 } }),
  };
  const [book] = await Promise.all([
    Book.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'UPDATE', { args, original }),
    syncToAllSatellites({
      bulkWrite: { books: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<BookDocument> },
    }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:update()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addRevision
 */
const addRevision = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, revision } = await bookRevisionSchema.concat(idSchema).validate(args);

  const [{ book: original, publisher }, isbnConflict] = await Promise.all([
    checkPermission(id, userId, isAdmin(userRoles)),
    !!revision.isbn && Book.exists({ 'revisions.isbn': revision.isbn }),
  ]);
  if (isbnConflict) throw { statusCode: 422, code: MSG_ENUM.DUPLICATED_ISBN };

  const msg = {
    enUS: `A book revision is added: ${original.title}, Rev: ${revision.rev} [/books/${id}].`,
    zhCN: `刚新增教科书版本：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
    zhHK: `剛新增教科書版本：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
  };
  const update: UpdateQuery<BookDocument> = {
    $push: { revisions: { _id: mongoId(), ...revision, imageUrls: [], createdAt: new Date() } },
  };
  const [book] = await Promise.all([
    Book.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addRevision', { args, originalRevisions: original.revisions }),
    syncToAllSatellites({
      bulkWrite: { books: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<BookDocument> },
    }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:addRevision()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * removeRevision
 */
const removeRevision = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, subId, remark } = await removeSchema.concat(subIdSchema).validate(args);

  const { book: original, publisher } = await checkPermission(id, userId, isAdmin(userRoles), {
    'revisions._id': subId,
  });

  const msg = {
    enUS: `A book revision is removed: ${original.title} [/books/${id}].`,
    zhCN: `刚删除教科书版本：${original.title} [/books/${id}]。`,
    zhHK: `剛刪除教科書版本：${original.title} [/books/${id}]。`,
  };

  // const imageUrls = original.revisions.find(rev => rev._id.equals(subId))?.imageUrls ?? [];
  const [book] = await Promise.all([
    Book.findOneAndUpdate(
      // { _id: id, revisions: { _id: subId } },
      { _id: id, 'revisions._id': subId },
      {
        $set: { 'revisions.$.deletedAt': new Date(), 'revisions.$.isbn': DELETED },
        ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
      },
      { fields: adminSelect, new: true },
    )
      .populate<Populate>(populate)
      .lean(),
    // ...imageUrls.map(async imageUrl => storage.removeObject(imageUrl)),
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeRevision', { args, originalRevisions: original.revisions }),
  ]);

  if (book) {
    const [transformed] = await Promise.all([
      transform(userId, userRoles, book, [publisher]),
      syncToAllSatellites({
        bulkWrite: {
          books: [
            { updateOne: { filter: { _id: id }, update: { revisions: book.revisions } } },
          ] satisfies BulkWrite<BookDocument>,
        },
        // minio: { serverUrl: config.server.minio.serverUrl, removeObjects: imageUrls },
      }),
    ]);
    return transformed;
  }
  log('error', 'bookController:removeRevision()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addRevisionImage
 */
const addRevisionImage = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, subId, url } = await idSchema.concat(subIdSchema).concat(urlSchema).validate(args);

  const [{ book: original, publisher }] = await Promise.all([
    checkPermission(id, userId, isAdmin(userRoles), { 'revisions._id': subId }),
    storage.validateObject(url, userId), // check file is uploaded to Minio successfully
  ]);

  const revision = original.revisions.find(r => r._id.equals(subId));
  if (revision) {
    const msg = {
      enUS: `A book cover photo is added: ${original.title}, Rev: ${revision.rev} [/books/${id}].`,
      zhCN: `刚新增教科书封面图片：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
      zhHK: `删新增教科書封面圖片：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
    };

    const [book] = await Promise.all([
      Book.findOneAndUpdate(
        { _id: id, 'revisions._id': subId },
        { $push: { 'revisions.$.imageUrls': url } },
        { fields: adminSelect, new: true },
      )
        .populate<Populate>(populate)
        .lean(),
      messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
      DatabaseEvent.log(userId, `/books/${id}`, 'addRevisionImage', { args }),
    ]);

    if (book) {
      const [transformed] = await Promise.all([
        transform(userId, userRoles, book, [publisher]),
        syncToAllSatellites({
          bulkWrite: {
            books: [
              { updateOne: { filter: { _id: id }, update: { revisions: book.revisions } } },
            ] satisfies BulkWrite<BookDocument>,
          },
          minio: { serverUrl: config.server.minio.serverUrl, addObjects: [url] },
        }),
      ]);
      return transformed;
    }
  }

  log('error', 'bookController:addRevisionImage()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * removeRevisionImage
 */
const removeRevisionImage = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, subId, remark, url } = await removeSchema.concat(subIdSchema).concat(urlSchema).validate(args);

  const { book: original, publisher } = await checkPermission(id, userId, isAdmin(userRoles), {
    'revisions._id': subId,
    'revisions.imageUrls': url,
  });

  const revision = original.revisions.find(r => r._id.equals(subId) && r.imageUrls.includes(url));
  if (revision) {
    const msg = {
      enUS: `A book cover photo is removed: ${original.title} , Rev: ${revision.rev} [/books/${id}].`,
      zhCN: `刚新增教科书封面图片：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
      zhHK: `刚刪除教科書封面圖片：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
    };

    const [book] = await Promise.all([
      await Book.findOneAndUpdate(
        { _id: id, 'revisions._id': subId },
        {
          $set: { 'revisions.$.imageUrls': `${CONTENT_PREFIX.BLOCKED}#${url}` },
          ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
        },
        { fields: adminSelect, new: true },
      )
        .populate<Populate>(populate)
        .lean(),
      // storage.removeObject(url), // delete file in Minio if exists
      messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
      DatabaseEvent.log(userId, `/books/${id}`, 'removeRevisionImage', { args }),
    ]);

    if (book) {
      const [transformed] = await Promise.all([
        transform(userId, userRoles, book, [publisher]),
        syncToAllSatellites({
          bulkWrite: {
            books: [
              { updateOne: { filter: { _id: id }, update: { revisions: book.revisions } } },
            ] satisfies BulkWrite<BookDocument>,
          }, // minio: { serverUrl: config.server.minio.serverUrl, removeObjects: [url] },
        }),
      ]);
      return transformed;
    }
  }
  log('error', 'bookController:removeRevisionImage()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addAssignment
 * ! note: ONLY admin has permission (not even publisher)
 */
const addAssignment = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const {
    id,
    assignment: { content: data, contribution: contributionFields, examples: examplesFields, ...assignmentFields },
  } = await bookAssignmentSchema.concat(idSchema).validate(args);

  const [{ book: original, publisher }, contributors, { systemId }] = await Promise.all([
    checkPermission(id, userId, isAdmin(userRoles)),
    sanitizeContributors(contributionFields.contributors),
    User.findSystemAccountIds(),
  ]);
  const creator = (contributors.length === 1 && contributors[0]?.user) || systemId; // if multiple contributors, use systemId

  const contribution = new Contribution<Partial<ContributionDocument>>({
    ...contributionFields,
    contributors,
    flags: [CONTRIBUTION.FLAG.BOOK_ASSIGNMENT],
    book: original._id,
    chapter: assignmentFields.chapter,
  });
  const contributionId = contribution._id.toString();

  const bookAssignmentId = mongoId();
  const parents = [`/bookAssignments/${bookAssignmentId}`];
  const content = new Content<Partial<ContentDocument>>({ parents, creator, data });
  const examples = examplesFields.map(data => new Content<Partial<ContentDocument>>({ parents, creator, data }));

  const assignment = new BookAssignment<Partial<BookAssignmentDocument>>({
    _id: bookAssignmentId,
    ...assignmentFields,
    contribution: contribution._id,
    content: content._id,
    examples: examples.map(e => e._id),
  });

  await Promise.all([contribution.save(), assignment.save()]); // save before populating

  const update: UpdateQuery<BookDocument> = { $push: { assignments: assignment._id } };
  const msg = `A book assignment (${bookAssignmentId}) is added to book (${id})`;
  const [book] = await Promise.all([
    Book.findOneAndUpdate({ _id: id, deletedAt: { $exists: false } }, update, { fields: adminSelect, new: true })
      .populate<Populate>(populate)
      .lean(),
    Content.insertMany([content, ...examples], { rawResult: true }),
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addAssignment', { args, bookAssignmentId, contributionId }),
    syncToAllSatellites({
      bulkWrite: {
        books: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<BookDocument>,
        bookAssignments: [
          { insertOne: { document: assignment.toObject() } },
        ] satisfies BulkWrite<BookAssignmentDocument>,
        contributions: [{ insertOne: { document: contribution } }] satisfies BulkWrite<ContributionDocument>,
      },
      contentsToken: await signContentIds(
        null,
        [content, ...examples].map(c => c._id),
      ),
    }),
  ]);
  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:addAssignment()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * removeAssignment
 * ! note: ONLY admin has permission (not even publisher)
 *
 * NOTE: mark bookAssignment deleted, BUT not update book document, (still able to populate assignment)
 */
const removeAssignment = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN'); // only isAdmin could proceed
  const { id, subId, remark } = await idSchema.concat(removeSchema).concat(subIdSchema).validate(args);

  const { publisher } = await checkPermission(id, userId, isAdmin(userRoles), { assignments: subId });
  await BookAssignment.updateOne({ _id: subId }, { deletedAt: new Date() }); // mark BookAssignment deleted before populating

  const msg = `A book assignment (${subId}) is removed from book (${id})`;
  const [book] = await Promise.all([
    Book.findByIdAndUpdate(
      id,
      { updatedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
      { fields: adminSelect, new: true },
    )
      .populate<Populate>(populate)
      .lean(),
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeAssignment', { args }),
    syncToAllSatellites({
      bulkWrite: {
        books: [
          { updateOne: { filter: { _id: id }, update: { updatedAt: new Date() } } },
        ] satisfies BulkWrite<BookDocument>,
        bookAssignments: [
          { updateOne: { filter: { _id: subId }, update: { deletedAt: new Date() } } },
        ] satisfies BulkWrite<BookAssignmentDocument>,
      },
    }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:removeAssignment()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addSupplement
 * ! note: ONLY admin has permission (not even publisher)
 */
const addSupplement = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();

  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const {
    id,
    supplement: { contribution: contributionFields, ...supplementFields },
  } = await bookSupplementSchema.concat(idSchema).validate(args);

  const [{ book: original, publisher }, contributors] = await Promise.all([
    checkPermission(id, userId, isAdmin(userRoles)),
    sanitizeContributors(contributionFields.contributors),
  ]);

  // save before population
  const contribution = await Contribution.create<Partial<ContributionDocument>>({
    ...contributionFields,
    contributors,
    flags: [CONTRIBUTION.FLAG.BOOK_SUPPLEMENT],
    book: original._id,
    chapter: supplementFields.chapter,
  });

  const update: UpdateQuery<BookDocument> = {
    $push: { supplements: { _id: mongoId(), contribution: contribution._id, ...supplementFields } },
  };
  const msg = `A book supplement is added to book (${id})`;
  await contribution.save(); // need to save before population
  const [book] = await Promise.all([
    Book.findOneAndUpdate({ _id: id, deletedAt: { $exists: false } }, update, { fields: adminSelect, new: true })
      .populate<Populate>(populate)
      .lean(),
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addSupplement', { args }),
    syncToAllSatellites({
      bulkWrite: {
        books: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<BookDocument>,
        contributions: [{ insertOne: { document: contribution.toObject() } }] satisfies BulkWrite<ContentDocument>,
      },
    }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:addSupplement()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * removeSupplement
 * ! note: ONLY admin has permission (not even publisher)
 */
const removeSupplement = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, subId, remark } = await subIdSchema.concat(removeSchema).validate(args);

  const { publisher } = await checkPermission(id, userId, isAdmin(userRoles), { 'supplements._id': subId });

  const msg = `A book supplement (${subId}) is removed from book (${id})`;
  const [book] = await Promise.all([
    Book.findOneAndUpdate(
      { _id: id, 'supplements._id': subId, deletedAt: { $exists: false } },
      {
        $set: { 'supplements.$.deletedAt': new Date() },
        ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
      },
      { fields: adminSelect, new: true },
    )
      .populate<Populate>(populate)
      .lean(),
    messageToAdmins(msg, userId, userLocale, isAdmin(userRoles), publisher.admins, `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeSupplement', { args }),
    syncToAllSatellites({
      bulkWrite: {
        books: [
          {
            updateOne: {
              filter: { _id: id, 'supplements._id': subId },
              update: { $set: { 'supplements.$.deletedAt': new Date() } },
            },
          },
        ] satisfies BulkWrite<BookDocument>,
      },
    }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:removeSupplement()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Book (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, book: req.body }) });
      case 'addRemark':
        return res.status(200).json({ data: await addRemark(req, { id, ...req.body }) });
      case 'addAssignment':
        return res.status(200).json({ data: await addAssignment(req, { id, ...req.body }) });
      case 'addRevision':
        return res.status(200).json({ data: await addRevision(req, { id, ...req.body }) });
      case 'addRevisionImage':
        return res.status(200).json({ data: await addRevisionImage(req, { id, ...req.body }) });
      case 'addSupplement':
        return res.status(200).json({ data: await addSupplement(req, { id, ...req.body }) });
      case 'removeAssignment':
        return res.status(200).json({ data: await removeAssignment(req, { id, ...req.body }) });
      case 'removeRevision':
        return res.status(200).json({ data: await removeRevision(req, { id, ...req.body }) });
      case 'removeRevisionImage':
        return res.status(200).json({ data: await removeRevisionImage(req, { id, ...req.body }) });
      case 'removeSupplement':
        return res.status(200).json({ data: await removeSupplement(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  addAssignment,
  addRemark,
  addRevision,
  addRevisionImage,
  addSupplement,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  isIsbnAvailable,
  remove,
  removeById,
  removeAssignment,
  removeRevision,
  removeRevisionImage,
  removeSupplement,
  update,
  updateById,
};
