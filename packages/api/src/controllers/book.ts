/**
 * Controller: Books
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { FilterQuery, LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

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
import Publisher from '../models/publisher';
import Subject from '../models/subject';
import { joinChatGroup, messageToAdmin } from '../utils/chat';
import { idsToString } from '../utils/helper';
import storage from '../utils/storage';
import syncSatellite from '../utils/sync-satellite';
import type { StatusResponse } from './common';
import common from './common';

type Action =
  | 'addAssignment'
  | 'addRemark'
  | 'addRevision'
  | 'addRevisionImage'
  | 'addSupplement'
  | 'joinChat'
  | 'removeAssignment'
  | 'removeRevision'
  | 'removeRevisionImage'
  | 'removeSupplement';

const { MSG_ENUM } = LOCALE;
const { CHAT_GROUP, CONTRIBUTION } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, DELETED, hubModeOnly, isAdmin, isTeacher, paginateSort, searchFilter, select } =
  common;
const {
  bookAssignmentIdSchema,
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

// const validateInputs = async ({ levels }: { levels: string[] }): Promise<void> => {
//   if (levels.length !== (await Level.countDocuments({ _id: { $in: levels } })))
//     throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
// };

/**
 * only publisher.admin or admin have permission to proceed
 */
const checkPermission = async (
  id: string,
  userId: string,
  userRoles: string[],
  extraFilter?: FilterQuery<BookDocument>,
) => {
  const book = await Book.findOne(
    extraFilter
      ? { _id: id, deletedAt: { $exists: false }, ...extraFilter }
      : { _id: id, deletedAt: { $exists: false } },
  ).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const publisher = await Publisher.findByPublisherId(book.publisher, userId, isAdmin(userRoles));

  return { book, publisher };
};

/**
 * (helper) Read Back with populate
 */
const findAndPopulate = async (
  req: Request,
  filter: FilterQuery<BookDocument>,
  options?: ReturnType<typeof paginateSort>,
) =>
  Book.find(
    filter,
    isAdmin(req.userRoles) || (await isTeacher(req.userExtra))
      ? `${select(req.userRoles)}`
      : `${select(req.userRoles)} -assignments`,
    options,
  )
    .populate([
      {
        path: 'assignments',
        select: select(),
        populate: [
          { path: 'contribution', select: select(), populate: { path: 'contributors', select: select() } },
          { path: 'content', select: select() },
          { path: 'examples', select: select() },
        ],
      },
      {
        path: 'supplements',
        select: select(),
        populate: {
          path: 'contribution',
          select: select(),
          populate: { path: 'contributors', select: select() },
        },
      },
    ])
    .lean();

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  await checkPermission(id, userId, userRoles);

  await Book.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();

  await DatabaseEvent.log(userId, `/books/${id}`, 'REMARK', { remark });

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<BookDocument> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { book: fields } = await bookSchema.validate(args);

  const [level, publisher, subjects] = await Promise.all([
    Level.findOne({ _id: fields.level, deletedAt: { $exists: false } }).lean(),
    Publisher.findByPublisherId(fields.publisher, userId, isAdmin(userRoles)),
    Subject.find({ _id: { $in: fields.subjects }, levels: fields.level, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!level || subjects.length !== fields.subjects.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const book = new Book<Partial<BookDocument>>(fields);
  const { _id, title } = book;

  const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
    flags: [CHAT_GROUP.FLAG.BOOK],
    title: `Book (${_id}) ${title} Discussion Group`,
    membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
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

  await Promise.all([
    book.save(),
    chatGroup.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${publisher._id}`),
    DatabaseEvent.log(userId, `/books/${_id}`, 'CREATE', { book: fields }),
    syncSatellite({}, { bookIds: [_id.toString()] }),
  ]);

  return book;
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
const find = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<BookDocument>(searchableFields, { query });
  return findAndPopulate(req, filter);
};

/**
 * Find Multiple with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<BookDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { title: 1 });

    const [total, books] = await Promise.all([Book.countDocuments(filter), findAndPopulate(req, filter, options)]);
    res.status(200).json({ meta: { total, ...options }, data: books });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument> | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);
  const filter = searchFilter<BookDocument>([], { query }, { _id: id });

  const books = await findAndPopulate(req, filter);
  return books[0]!;
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
  return !(await Book.findOne({ 'revisions.isbn': isbn }).lean());
};

/**
 * Join Book Chat
 */
const joinChat = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userExtra, userLocale, userName } = auth(req);
  const { id } = await idSchema.validate(args);

  if (!(await isTeacher(userExtra))) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const book = await Book.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = {
    enUS: `${userName} (userId: ${userId}), Welcome to join book discussion group ${book.title} [[/books/${id}]].`,
    zhCN: `${userName} (userId: ${userId})，欢迎你加入讨论区 ${book.title} [[/books/${id}]]。`,
    zhHK: `${userName} (userId: ${userId})，歡迎你加入討論區 ${book.title} [[/books/${id}]]。`,
  };

  await joinChatGroup(book.chatGroup.toString(), msg, [userId], userLocale); // joinChatGroup() runs notify() & syncSatellite()
  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete by ID
 * ! ONLY Admin could remove book
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN'); // ONLY admin could remove book
  const { id, remark } = await removeSchema.validate(args);
  const { publisher } = await checkPermission(id, userId, userRoles);

  const book = await Book.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { deletedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
    { fields: select(userRoles), new: true },
  ).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `${book.title} [/books/${id}]`;
  const msg = {
    enUS: `A book is removed: ${common}.`,
    zhCN: `刚删除教科书：${common}。`,
    zhHK: `剛刪除教科書：${common}。`,
  };

  // const bookRevisionsImageUrls = book.revisions.map(rev => rev.imageUrls).flat();
  await Promise.all([
    // ...bookRevisionsImageUrls.map(async url => storage.removeObject(url)), // remove all revision images
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${book.publisher}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'DELETE', { remark, book }),
    // syncSatellite({}, { bookIds: [id],...(logoUrl && { minioRemoveItems: [bookRevisionsImageUrls]  }),
    syncSatellite({}, { bookIds: [id] }),
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
const update = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, book: fields } = await bookSchema.concat(idSchema).validate(args);

  const [{ book: original, publisher }, level, subjects] = await Promise.all([
    checkPermission(id, userId, userRoles),
    Level.findOne({ _id: fields.level, deletedAt: { $exists: false } }).lean(),
    Subject.find({ _id: { $in: fields.subjects }, levels: fields.level, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  //! not allow to change publisher
  if (original.publisher.toString() !== fields.publisher || !level || subjects.length !== fields.subjects.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `${fields.title} [/books/${id}]`;
  const msg = {
    enUS: `A book is updated: ${common}.`,
    zhCN: `刚更新教科书：${common}。`,
    zhHK: `剛更新教科書：${common}。`,
  };
  await Promise.all([
    Book.findByIdAndUpdate(id, fields, { fields: select(userRoles), new: true }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${publisher._id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'UPDATE', { original, update: fields }),
    syncSatellite({}, { bookIds: [id] }),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * addRevision
 */
const addRevision = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, revision } = await bookRevisionSchema.concat(idSchema).validate(args);

  const [{ book: original, publisher }, isbnConflict] = await Promise.all([
    checkPermission(id, userId, userRoles),
    revision.isbn ? Book.findOne({ 'revisions.isbn': revision.isbn }) : null,
  ]);
  if (isbnConflict) throw { statusCode: 422, code: MSG_ENUM.DUPLICATED_ISBN };

  const msg = {
    enUS: `A book revision is added: ${original.title}, Rev: ${revision.rev} [/books/${id}].`,
    zhCN: `刚新增教科书版本：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
    zhHK: `剛新增教科書版本：${original.title}, 版本：${revision.rev} [/books/${id}]。`,
  };

  await Promise.all([
    Book.findByIdAndUpdate(
      id,
      { $push: { revisions: { ...revision, imageUrls: [], createdAt: new Date() } } },
      { fields: select(userRoles), new: true },
    ).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addRevision', { original, revision }),
    syncSatellite({}, { bookIds: [id] }),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * removeRevision
 */
const removeRevision = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, revisionId, remark } = await bookRevisionIdSchema.concat(removeSchema).validate(args);

  const { book: original, publisher } = await checkPermission(id, userId, userRoles, { 'revisions._id': revisionId });

  const msg = {
    enUS: `A book revision is removed: ${original.title} [/books/${id}].`,
    zhCN: `刚删除教科书版本：${original.title} [/books/${id}]。`,
    zhHK: `剛刪除教科書版本：${original.title} [/books/${id}]。`,
  };

  await Promise.all([
    Book.findOneAndUpdate(
      // { _id: id, revisions: { _id: revisionId } },
      { _id: id, 'revisions._id': revisionId },
      {
        $set: { 'revisions.$.deletedAt': new Date(), 'revisions.$.isbn': DELETED },
        ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
      },
      { fields: select(userRoles), new: true },
    ).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeRevision', { remark, original, revisionId }),
    syncSatellite({}, { bookIds: [id] }),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * addRevisionImage
 */
const addRevisionImage = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, revisionId, url } = await bookRevisionIdSchema.concat(idSchema).concat(urlSchema).validate(args);

  const [{ book: original, publisher }] = await Promise.all([
    checkPermission(id, userId, userRoles, { 'revisions._id': revisionId }),
    storage.validateObject(url, userId), // check file is uploaded to Minio successfully
  ]);

  const revision = original.revisions.find(r => r._id!.toString() === revisionId);
  const msg = {
    enUS: `A book cover photo is added: ${original.title}, Rev: ${revision!.rev} [/books/${id}].`,
    zhCN: `刚新增教科书封面图片：${original.title}, 版本：${revision!.rev} [/books/${id}]。`,
    zhHK: `删新增教科書封面圖片：${original.title}, 版本：${revision!.rev} [/books/${id}]。`,
  };

  await Promise.all([
    Book.findOneAndUpdate(
      { _id: id, 'revisions._id': revisionId },
      { $push: { 'revisions.$.imageUrls': url } },
      { fields: select(userRoles), new: true },
    ).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addRevisionImage', { revisionId, url: url }),
    syncSatellite({}, { bookIds: [id], minioAddItems: [url] }),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * removeRevisionImage
 */
const removeRevisionImage = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, revisionId, remark, url } = await bookRevisionIdSchema
    .concat(removeSchema)
    .concat(urlSchema)
    .validate(args);

  const { book: original, publisher } = await checkPermission(id, userId, userRoles, {
    'revisions._id': revisionId,
    'revisions.imageUrls': url,
  });

  const revision = original.revisions.find(r => r._id!.toString() === revisionId);
  const msg = {
    enUS: `A book cover photo is removed: ${original.title} , Rev: ${revision?.rev} [/books/${id}].`,
    zhCN: `刚新增教科书封面图片：${original.title}, 版本：${revision?.rev} [/books/${id}]。`,
    zhHK: `刚刪除教科書封面圖片：${original.title}, 版本：${revision?.rev} [/books/${id}]。`,
  };

  await Promise.all([
    await Book.findOneAndUpdate(
      { _id: id, 'revisions._id': revisionId },
      {
        $set: { 'revisions.$.imageUrls': `${CONTENT_PREFIX.BLOCKED}${url}` },
        ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
      },
      { fields: select(userRoles), new: true },
    ).lean(),
    // storage.removeObject(url), // delete file in Minio if exists
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${original.publisher}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeRevisionImage', { revisionId, url }),
    syncSatellite({}, { bookIds: [id], minioRemoveItems: [url] }),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * addAssignment
 * ! note: ONLY admin has permission (not even publisher)
 */
const addAssignment = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const {
    id,
    assignment: { content: data, contribution: contributionFields, examples: examplesFields, ...assignmentFields },
  } = await bookAssignmentSchema.concat(idSchema).validate(args);

  const contribution = new Contribution<Partial<ContributionDocument>>({
    ...contributionFields,
    flags: [CONTRIBUTION.FLAG.BOOK_ASSIGMENT],
    book: id,
    chapter: assignmentFields.chapter,
  });
  const content = new Content<Partial<ContentDocument>>({ creator: userId, data });
  const examples = examplesFields.map(data => new Content<Partial<ContentDocument>>({ creator: userId, data }));
  const assignment = new BookAssignment<Partial<BookAssignmentDocument>>({
    ...assignmentFields,
    contribution,
    content,
    examples,
  });
  const assignmentId = assignment._id.toString();
  content.parents = [`/bookAssignment/${assignmentId}`];
  examples.forEach(ex => (ex.parents = [`/bookAssignment/${assignmentId}`]));

  const book = await Book.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { $push: { assignments: assignment } },
    { fields: select(userRoles) },
  ).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = `A book assignment (${assignmentId}) is added to book (${id})`;
  const contentIds = idsToString([content, ...examples]);
  const contributionId = contribution._id.toString();

  await Promise.all([
    assignment.save(),
    contribution.save(),
    content.save(),
    ...examples.map(example => example.save()),
    messageToAdmin(msg, userId, userLocale, userRoles, [], `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addAssignment', { assignmentId, contributionId, args }),
    syncSatellite(
      {},
      { bookIds: [id], bookAssignmentIds: [assignmentId], contributionIds: [contributionId], contentIds },
    ),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * removeAssignment
 * ! note: ONLY admin has permission (not even publisher)
 */
const removeAssignment = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, assignmentId, remark } = await bookAssignmentIdSchema.concat(removeSchema).validate(args);

  const book = await Book.findOneAndUpdate(
    { _id: id, assignments: assignmentId, deletedAt: { $exists: false } },
    { ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
    { fields: select(userRoles), new: true },
  ).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = `A book assignment (${assignmentId}) is removed from book (${id})`;
  await Promise.all([
    BookAssignment.findByIdAndUpdate(assignmentId, { deletedAt: new Date() }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeAssignment', { remark, assignmentId }),
    syncSatellite({}, { bookAssignmentIds: [assignmentId] }),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * addSupplement
 * ! note: ONLY admin has permission (not even publisher)
 */
const addSupplement = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  hubModeOnly();

  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const {
    id,
    supplement: { contribution: contributionFields, ...supplementFields },
  } = await bookSupplementSchema.concat(idSchema).validate(args);

  const contribution = new Contribution<Partial<ContributionDocument>>({
    ...contributionFields,
    flags: [CONTRIBUTION.FLAG.BOOK_SUPPLEMENT],
    book: id,
    chapter: supplementFields.chapter,
  });
  const book = await Book.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { $push: { supplements: { contribution, ...supplementFields } } },
    { fields: select(userRoles) },
  ).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = `A book supplement is added to book (${id})`;
  await Promise.all([
    contribution.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'addSupplement', { args }),
    syncSatellite({}, { bookIds: [id], contributionIds: [contribution._id.toString()] }),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
};

/**
 * removeSupplement
 * ! note: ONLY admin has permission (not even publisher)
 */
const removeSupplement = async (req: Request, args: unknown): Promise<LeanDocument<BookDocument>> => {
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, supplementId, remark } = await bookSupplementIdSchema.concat(removeSchema).validate(args);

  const book = await Book.findOneAndUpdate(
    { _id: id, 'supplements._id': supplementId, deletedAt: { $exists: false } },
    {
      $set: { 'supplements.$.deletedAt': new Date() },
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
    { fields: select(userRoles), new: true },
  ).lean();
  if (!book) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = `A book supplement (${supplementId}) is removed from book (${id})`;
  await Promise.all([
    messageToAdmin(msg, userId, userLocale, userRoles, [], `BOOK#${id}`),
    DatabaseEvent.log(userId, `/books/${id}`, 'removeSupplement', { remark, supplementId }),
    syncSatellite({}, { bookIds: [id] }),
  ]);

  // read-back
  const books = await findAndPopulate(req, { _id: id });
  return books[0]!;
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
      case 'joinChat':
        return res.status(200).json(await joinChat(req, { id }));
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
  joinChat,
  remove,
  removeById,
  removeAssignment,
  removeRevision,
  removeRevisionImage,
  removeSupplement,
  update,
  updateById,
};
