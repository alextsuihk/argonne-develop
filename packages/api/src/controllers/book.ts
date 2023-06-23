/**
 * Controller: Books
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { FilterQuery } from 'mongoose';
import mongoose from 'mongoose';

import type { BookAssignmentDocument, BookDocument, Id } from '../models/book';
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
import { messageToAdmin } from '../utils/chat';
import { idsToString } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';
import { PUBLIC, signContentIds } from './content';

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

type BookDocumentEx = BookDocument & Id & { contentsToken: string };

const { MSG_ENUM } = LOCALE;
const { CHAT_GROUP, CONTRIBUTION, USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, DELETED, hubModeOnly, isAdmin, isTeacher, paginateSort, searchFilter, select } =
  common;
const {
  assignmentIdSchema,
  bookAssignmentSchema,
  bookIsbnSchema,
  bookRevisionIdSchema,
  bookRevisionSchema,
  bookSupplementIdSchema,
  bookSupplementSchema,
  bookSchema,
  idSchema,
  querySchema,
  remarkSchema,
  removeSchema,
  urlSchema,
} = yupSchema;

const adminSelect = select([USER.ROLE.ADMIN]);

// nested populate
const nestedPopulate = [
  { path: 'assignments', select: adminSelect, populate: [{ path: 'contribution', select: adminSelect }] },
  { path: 'supplements.contribution', select: adminSelect },
];

/**
 * only publisher.admin or admin have permission to proceed
 */
const checkPermission = async (
  id: string,
  userId: string,
  isAdmin: boolean,
  extraFilter?: FilterQuery<BookDocument>,
) => {
  const book = await Book.findOne({ _id: id, deletedAt: { $exists: false }, ...extraFilter }).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const publisher = await Publisher.findByPublisherId(book.publisher, userId, isAdmin);

  return { book, publisher };
};

/**
 * (helper) hide solutions (to general students), hide remark, and generate contentsToken
 */
const transform = async (
  userId: string,
  userRoles: string[],
  book: BookDocument & Id,
  publishers: (PublisherDocument & Id)[],
  isTeacher = true,
): Promise<BookDocumentEx> => {
  const isPublisherAdmin = !!publishers
    .find(p => p._id.toString() === book.publisher.toString())
    ?.admins.includes(userId);

  const hideRemark = !isAdmin(userRoles) && !isPublisherAdmin;

  // optionally hide solutions
  // assignment as (BookAssignmentDocument & Id)[]
  const assignments = book.assignments.map(assignment =>
    typeof assignment === 'string' || assignment instanceof mongoose.Types.ObjectId
      ? assignment
      : {
          ...assignment,
          ...(hideRemark && { remarks: [] }),
          ...(!isAdmin(userRoles) && !isPublisherAdmin && !isTeacher && { solutions: [] }),
          contribution:
            typeof assignment.contribution === 'string' || assignment.contribution instanceof mongoose.Types.ObjectId
              ? assignment.contribution
              : { ...assignment.contribution, ...(hideRemark && { remarks: [] }) },
        },
  );

  return {
    ...book,
    ...(hideRemark && { remarks: [] }),
    assignments,
    supplements: book.supplements.map(supplement =>
      typeof supplement === 'string' || supplement instanceof mongoose.Types.ObjectId
        ? supplement
        : {
            ...supplement,
            contribution:
              typeof supplement.contribution === 'string' || supplement.contribution instanceof mongoose.Types.ObjectId
                ? supplement.contribution
                : { ...supplement.contribution, ...(hideRemark && { remarks: [] }) },
          },
    ),
    contentsToken: await signContentIds(
      userId,
      assignments
        .map(assignment =>
          typeof assignment === 'string' || assignment instanceof mongoose.Types.ObjectId
            ? 'ERROR' // this is not possible (if populating correctly)
            : idsToString([assignment.content, ...assignment.examples]),
        )
        .flat(),
    ),
  };
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
    { fields: adminSelect, new: true, populate: nestedPopulate },
  ).lean();
  if (book) {
    const [transformed] = await Promise.all([
      transform(userId, userRoles, book, [publisher]),
      DatabaseEvent.log(userId, `/books/${id}`, 'REMARK', { remark }),
    ]);
    return transformed;
  }
  log('error', 'bookController:addRemark()', { id, remark }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { book: fields } = await bookSchema.validate(args);

  const [level, publisher, subjectCount] = await Promise.all([
    Level.exists({ _id: fields.level, deletedAt: { $exists: false } }),
    Publisher.findByPublisherId(fields.publisher, userId, isAdmin(userRoles)),
    Subject.countDocuments({
      _id: { $in: fields.subjects },
      levels: fields.level,
      deletedAt: { $exists: false },
    }),
  ]);
  if (!level || subjectCount !== fields.subjects.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const book = new Book<Partial<BookDocument>>(fields);
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
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${publisher._id}`),
    DatabaseEvent.log(userId, `/books/${_id}`, 'CREATE', { book: fields }),
    notifySync('CORE', {}, { bookIds: [_id] }),
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
    Book.find(filter, adminSelect).populate(nestedPopulate).lean(),
    userId ? Publisher.find({ admins: userId }).lean() : [],
    isTeacher(userExtra),
  ]);

  return Promise.all(
    books.map(async book => transform(userId ?? PUBLIC, userRoles ?? [], book, publishers, isActiveTeacher)),
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
      Book.find(filter, adminSelect, options).populate(nestedPopulate).lean(),
      userId ? Publisher.find({ admins: userId }).lean() : [],
      isTeacher(userExtra),
    ]);
    res.status(200).json({
      meta: { total, ...options },
      data: await Promise.all(
        books.map(async book => transform(userId ?? PUBLIC, userRoles ?? [], book, publishers, isActiveTeacher)),
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
    Book.findOne(filter, adminSelect).populate(nestedPopulate).lean(),
    userId ? Publisher.find({ admins: userId }).lean() : [],
    isTeacher(userExtra),
  ]);

  return book && transform(userId || PUBLIC, userRoles ?? [], book, publishers, isActiveTeacher);
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

  // const bookRevisionsImageUrls = book.revisions.map(rev => rev.imageUrls).flat();
  await Promise.all([
    Book.updateOne(
      { _id: id, deletedAt: { $exists: false } },
      { deletedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
    ),
    // ...bookRevisionsImageUrls.map(async url => storage.removeObject(url)), // remove all revision images
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'DELETE', { remark, original }),
    // notifySync('CORE',{}, { bookIds: [id],...(logoUrl && { minioRemoveItems: bookRevisionsImageUrls  }),
    notifySync('CORE', {}, { bookIds: [id] }),
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
  const { id, book: fields } = await bookSchema.concat(idSchema).validate(args);

  const [{ book: original, publisher }, level, subjectCount] = await Promise.all([
    checkPermission(id, userId, isAdmin(userRoles)),
    Level.exists({ _id: fields.level, deletedAt: { $exists: false } }),
    Subject.countDocuments({ _id: { $in: fields.subjects }, levels: fields.level, deletedAt: { $exists: false } }),
  ]);
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  //! not allow to change publisher
  if (original.publisher.toString() !== fields.publisher || !level || subjectCount !== fields.subjects.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `${fields.title} [/books/${id}]`;
  const msg = {
    enUS: `A book is updated: ${common}.`,
    zhCN: `刚更新教科书：${common}。`,
    zhHK: `剛更新教科書：${common}。`,
  };
  const [book] = await Promise.all([
    Book.findByIdAndUpdate(id, fields, { fields: adminSelect, new: true, populate: nestedPopulate }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${publisher._id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'UPDATE', { original, update: fields }),
    notifySync('CORE', {}, { bookIds: [id] }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:update()', { id, ...fields }, userId);
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

  const [book] = await Promise.all([
    Book.findByIdAndUpdate(
      id,
      { $push: { revisions: { ...revision, imageUrls: [], createdAt: new Date() } } },
      { fields: adminSelect, new: true, populate: nestedPopulate },
    ).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addRevision', { originalRevisions: original.revisions, revision }),
    notifySync('CORE', {}, { bookIds: [id] }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:addRevision()', { id, revision }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * removeRevision
 */
const removeRevision = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, revisionId, remark } = await bookRevisionIdSchema.concat(removeSchema).validate(args);

  const { book: original, publisher } = await checkPermission(id, userId, isAdmin(userRoles), {
    'revisions._id': revisionId,
  });

  const msg = {
    enUS: `A book revision is removed: ${original.title} [/books/${id}].`,
    zhCN: `刚删除教科书版本：${original.title} [/books/${id}]。`,
    zhHK: `剛刪除教科書版本：${original.title} [/books/${id}]。`,
  };

  const [book] = await Promise.all([
    Book.findOneAndUpdate(
      // { _id: id, revisions: { _id: revisionId } },
      { _id: id, 'revisions._id': revisionId },
      {
        $set: { 'revisions.$.deletedAt': new Date(), 'revisions.$.isbn': DELETED },
        ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
      },
      { fields: adminSelect, new: true, populate: nestedPopulate },
    ).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeRevision', {
      remark,
      originalRevisions: original.revisions,
      revisionId,
    }),
    notifySync('CORE', {}, { bookIds: [id] }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:removeRevision()', { id, revisionId, remark }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addRevisionImage
 */
const addRevisionImage = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, revisionId, url } = await bookRevisionIdSchema.concat(idSchema).concat(urlSchema).validate(args);

  const [{ book: original, publisher }] = await Promise.all([
    checkPermission(id, userId, isAdmin(userRoles), { 'revisions._id': revisionId }),
    storage.validateObject(url, userId), // check file is uploaded to Minio successfully
  ]);

  const revision = original.revisions.find(r => r._id.toString() === revisionId);
  if (revision) {
    const msg = {
      enUS: `A book cover photo is added: ${original.title}, Rev: ${revision.rev} [/books/${id}].`,
      zhCN: `刚新增教科书封面图片：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
      zhHK: `删新增教科書封面圖片：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
    };

    const [book] = await Promise.all([
      Book.findOneAndUpdate(
        { _id: id, 'revisions._id': revisionId },
        { $push: { 'revisions.$.imageUrls': url } },
        { fields: adminSelect, new: true, populate: nestedPopulate },
      ).lean(),
      messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
      DatabaseEvent.log(userId, `/books/${id}`, 'addRevisionImage', { revisionId, url }),
      notifySync('CORE', {}, { bookIds: [id], minioAddItems: [url] }),
    ]);

    if (book) return transform(userId, userRoles, book, [publisher]);
  }

  log('error', 'bookController:addRevisionImage()', { id, revisionId, url }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * removeRevisionImage
 */
const removeRevisionImage = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, revisionId, remark, url } = await bookRevisionIdSchema
    .concat(removeSchema)
    .concat(urlSchema)
    .validate(args);

  const { book: original, publisher } = await checkPermission(id, userId, isAdmin(userRoles), {
    'revisions._id': revisionId,
    'revisions.imageUrls': url,
  });

  const revision = original.revisions.find(r => r._id.toString() === revisionId && r.imageUrls.includes(url));
  if (revision) {
    const msg = {
      enUS: `A book cover photo is removed: ${original.title} , Rev: ${revision.rev} [/books/${id}].`,
      zhCN: `刚新增教科书封面图片：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
      zhHK: `刚刪除教科書封面圖片：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
    };

    const [book] = await Promise.all([
      await Book.findOneAndUpdate(
        { _id: id, 'revisions._id': revisionId },
        {
          $set: { 'revisions.$.imageUrls': `${CONTENT_PREFIX.BLOCKED}#${url}` },
          ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
        },
        { fields: adminSelect, new: true, populate: nestedPopulate },
      ).lean(),
      // storage.removeObject(url), // delete file in Minio if exists
      messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
      DatabaseEvent.log(userId, `/books/${id}`, 'removeRevisionImage', { revisionId, url }),
      notifySync('CORE', {}, { bookIds: [id], minioRemoveItems: [url] }),
    ]);

    if (book) return transform(userId, userRoles, book, [publisher]);
  }

  log('error', 'bookController:removeRevisionImage()', { id, revisionId, remark, url }, userId);
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

  const contribution = new Contribution<Partial<ContributionDocument>>({
    ...contributionFields,
    flags: [CONTRIBUTION.FLAG.BOOK_ASSIGNMENT],
    book: id,
    chapter: assignmentFields.chapter,
  });
  const content = new Content<Partial<ContentDocument>>({ parents: [`/bookAssignments/${id}`], creator: userId, data });
  const examples = examplesFields.map(
    data => new Content<Partial<ContentDocument>>({ parents: [`/bookAssignments/${id}`], creator: userId, data }),
  );
  const assignment = new BookAssignment<Partial<BookAssignmentDocument>>({
    ...assignmentFields,
    contribution,
    content: content._id,
    examples: idsToString(examples),
  });
  const assignmentId = assignment._id.toString();
  content.parents = [`/bookAssignment/${assignmentId}`];
  examples.forEach(ex => (ex.parents = [`/bookAssignment/${assignmentId}`]));

  // save before populating
  await Promise.all([contribution.save(), assignment.save()]);

  const book = await Book.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { $push: { assignments: assignment } },
    { fields: adminSelect, new: true, populate: nestedPopulate },
  ).lean();
  if (!book) {
    await Promise.all([
      Contribution.deleteOne({ _id: contribution }),
      BookAssignment.deleteOne({ _id: assignment }), // undo & remove bookAssignment
    ]);
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  }

  const msg = `A book assignment (${assignmentId}) is added to book (${id})`;
  const contributionId = contribution._id.toString();

  const [publisher] = await Promise.all([
    Publisher.findByPublisherId(book.publisher, userId, isAdmin(userRoles)),
    Content.create([content, ...examples]),
    messageToAdmin(msg, userId, userLocale, userRoles, [], `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addAssignment', { assignmentId, contributionId, args }),
    notifySync(
      'CORE',
      {},
      {
        bookIds: [id],
        bookAssignmentIds: [assignmentId],
        contributionIds: [contributionId],
        contentIds: [content, ...examples],
      },
    ),
  ]);

  return transform(userId, userRoles, book, [publisher]);
};

/**
 * removeAssignment
 * ! note: ONLY admin has permission (not even publisher)
 *
 * NOTE: mark bookAssignment deleted, BUT not update book document, (still able to populate assignment)
 */
const removeAssignment = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, assignmentId, remark } = await assignmentIdSchema.concat(idSchema).concat(removeSchema).validate(args);

  const original = await Book.findOne({ _id: id, assignments: assignmentId, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await BookAssignment.updateOne({ _id: assignmentId }, { deletedAt: new Date() }); // update BookAssignment before populating

  const msg = `A book assignment (${assignmentId}) is removed from book (${id})`;
  const [book, publisher] = await Promise.all([
    Book.findOneAndUpdate(
      { _id: id, assignments: assignmentId, deletedAt: { $exists: false } },
      {
        // $pull: { assignments: assignmentId },
        updatedAt: new Date(),
        ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
      },
      { fields: adminSelect, new: true, populate: nestedPopulate },
    ).lean(),
    Publisher.findByPublisherId(original.publisher, userId, isAdmin(userRoles)),
    messageToAdmin(msg, userId, userLocale, userRoles, [], `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeAssignment', { remark, assignmentId }),
    notifySync('CORE', {}, { bookIds: [id], bookAssignmentIds: [assignmentId] }),
  ]);

  if (book) return transform(userId, userRoles, book, [publisher]);
  log('error', 'bookController:removeAssignment()', { id, assignmentId, remark }, userId);
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

  const contribution = await Contribution.create<Partial<ContributionDocument>>({
    ...contributionFields,
    flags: [CONTRIBUTION.FLAG.BOOK_SUPPLEMENT],
    book: id,
    chapter: supplementFields.chapter,
  });

  const book = await Book.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { $push: { supplements: { contribution, ...supplementFields } } },
    { fields: adminSelect, new: true, populate: nestedPopulate },
  ).lean();
  if (!book) {
    await Contribution.deleteOne({ _id: contribution }); // undo & remove contribution
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  }

  const msg = `A book supplement is added to book (${id})`;
  const [publisher] = await Promise.all([
    Publisher.findByPublisherId(book.publisher, userId, isAdmin(userRoles)),
    messageToAdmin(msg, userId, userLocale, userRoles, [], `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addSupplement', { args }),
    notifySync('CORE', {}, { bookIds: [id], contributionIds: [contribution] }),
  ]);

  return transform(userId, userRoles, book, [publisher]);
};

/**
 * removeSupplement
 * ! note: ONLY admin has permission (not even publisher)
 */
const removeSupplement = async (req: Request, args: unknown): Promise<BookDocumentEx> => {
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, supplementId, remark } = await bookSupplementIdSchema.concat(removeSchema).validate(args);

  const book = await Book.findOneAndUpdate(
    { _id: id, 'supplements._id': supplementId, deletedAt: { $exists: false } },
    {
      $set: { 'supplements.$.deletedAt': new Date() },
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
    { fields: adminSelect, new: true, populate: nestedPopulate },
  ).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = `A book supplement (${supplementId}) is removed from book (${id})`;
  const [publisher] = await Promise.all([
    Publisher.findByPublisherId(book.publisher, userId, isAdmin(userRoles)),
    messageToAdmin(msg, userId, userLocale, userRoles, [], `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeSupplement', { remark, supplementId }),
    notifySync('CORE', {}, { bookIds: [id] }),
  ]);

  return transform(userId, userRoles, book, [publisher]);
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
