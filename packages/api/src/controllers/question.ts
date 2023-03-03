/**
 * Controller: Question
 *
 * presently, the structure supports multiple students to multiple tutors (or teachers), but 1x1 is preferred
 * student could add students, tutor could add tutors
 */

import { DocumentSync, LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { FilterQuery, LeanDocument, PopulateOptions, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import { Homework } from '../models/assignment';
import Book from '../models/book';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import ChatGroup from '../models/chat-group';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import type { BidDocument, Member, QuestionDocument } from '../models/question';
import Question, { Bid } from '../models/question';
import Subject from '../models/subject';
import Tenant from '../models/tenant';
import TutorRanking from '../models/tutor-ranking';
import User from '../models/user';
import censor from '../utils/censor';
import type { ChatResponse } from '../utils/chat';
import { idsToString } from '../utils/helper';
import { notify } from '../utils/messaging';
import syncSatellite from '../utils/sync-satellite';
import { checkOwnership } from './chat';
import type { StatusResponse } from './common';
import common from './common';

type Action =
  | 'addStudents'
  | 'addTutors'
  | 'bid'
  | 'clearFlag'
  | 'setFlag'
  | 'updateLastViewedAt'
  | 'updateTutorRanking';

type Role = 'student' | 'tutor' | 'bidder';

const { MSG_ENUM } = LOCALE;
const { QUESTION, TENANT, USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, paginateSort, searchFilter, select } = common;
const { config } = configLoader;
const {
  flagSchema,
  idSchema,
  questionBidSchema,
  questionSchema,
  questionUpdateSchema,
  querySchema,
  rankingSchema,
  optionalTimestampSchema,
  userIdsSchema,
} = yupSchema;

/**
 * (helper) Read Back with populate
 */
const findAndPopulate = async (
  role: Role,
  filter: FilterQuery<QuestionDocument>,
  userId: string,
): Promise<LeanDocument<QuestionDocument>[]> => {
  role === 'student'
    ? (filter.students = userId)
    : role === 'tutor'
    ? (filter.tutors = userId)
    : (filter.bidders = userId);

  const qSelect =
    role === 'student' ? select() : role == 'tutor' ? `${select()} -bidders -bids` : `${select()} -tutors -bidders`;

  const populate: PopulateOptions[] =
    role === 'student'
      ? [
          { path: 'content', select: select() },
          { path: 'contents', select: select() },
          { path: 'bids', select: select() },
        ]
      : role === 'tutor'
      ? [
          { path: 'content', select: select() },
          { path: 'contents', select: select() },
        ]
      : [
          { path: 'content', select: select() },
          { path: 'bids', select: select(), match: { user: userId } },
        ];

  return Question.find(filter, qSelect).populate(populate);
};

const findOneAndPopulate = async (question: LeanDocument<QuestionDocument>, userId: string) => {
  const { _id, students, tutors } = question;
  const questions = await findAndPopulate(
    idsToString(students).includes(userId) ? 'student' : idsToString(tutors).includes(userId) ? 'tutor' : 'bidder',
    { _id },
    userId,
  );

  return questions[0]!;
};

/**
 * Bid Question
 * students or bidders could update bid
 */
const bid = async (req: Request, args: unknown): Promise<LeanDocument<QuestionDocument>> => {
  const { userId, userTenants } = auth(req);
  const fields = await questionBidSchema.validate(args);
  const { id, bidderIds, bidId, message, price, accept } = fields;

  const [bidders, question] = await Promise.all([
    bidderIds.length ? User.find({ _id: bidderIds, tenants: { $in: userTenants } }).lean() : [], // student could add/remove bidderIds
    Question.findOne({
      _id: id,
      $or: [{ students: userId }, { bidders: userId }],
      'tutors.0': { $exists: false },
      bids: bidId,
      deletedAt: { $exists: false },
    }).lean(),
  ]);

  // newBidders must be in question.tenant
  if (!question || bidders.some(b => !idsToString(b.tenants).includes(question.tenant.toString())))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tenant = await Tenant.findByTenantId(question?.tenant);
  if (!tenant.services.includes(TENANT.SERVICE.QUESTION_BID))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const isOwner = idsToString(question.students).includes(userId);
  // TODO: EOL
  // const questionUpdate = merge.all<UpdateQuery<QuestionDocument>>([
  //   !isOwner && accept ? { bidders: [], tutors: [userId], $push: { members: { user: userId, flags: [] } } } : {}, // update bidders & tutors, once any bidder accepts
  //   isOwner && price ? { price } : {},
  //   isOwner && bidderIds.length ? { bidders } : {},
  // ]);
  const questionUpdate: UpdateQuery<QuestionDocument> = {
    ...(!isOwner && accept && { bidders: [], tutors: [userId], $push: { members: { user: userId, flags: [] } } }),
    ...(isOwner && price && { price }),
    ...(isOwner && bidderIds.length && { bidders }),
  };

  const userIds = [...question.students, ...question.bidders, ...bidderIds]; // notify old & new bidders

  await Promise.all([
    Object.keys(questionUpdate).length && Question.findByIdAndUpdate(question, questionUpdate),
    message &&
      Bid.findByIdAndUpdate(bidId, {
        $push: { messages: { creator: userId, data: message, createdAt: Date.now() } },
      }).lean(),
    DatabaseEvent.log(userId, `/questions/${id}`, 'BID', { question: fields }),
    notify(userIds, 'QUESTION', { questionIds: [id] }),
    syncSatellite({ tenantId: question.tenant, userIds }, { questionIds: [id] }),
  ]);

  return findOneAndPopulate(question, userId); // read-back with populated
};

/**
 * Create (ask) a question
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<QuestionDocument>> => {
  const { userFlags, userId, userLocale, userTenants } = auth(req);
  const {
    question: { tenantId, tutors: inputTutors, content: data, ...fields },
  } = await questionSchema.validate(args);

  const [tutors, book, classroom, level, subject, homework, tenant] = await Promise.all([
    User.find({ _id: { $in: inputTutors }, tenants: tenantId }).lean(),
    fields.book && Book.findOne({ _id: fields.book, level: fields.level, subjects: fields.subject }),
    fields.classroom && Classroom.findOne({ _id: fields.classroom, $or: [{ teachers: userId }, { students: userId }] }),
    fields.homework && Homework.findOne({ _id: fields.homework, deletedAt: { $exists: false } }),
    Level.findOne({ _id: fields.level, deletedAt: { $exists: false } }).lean(),
    Subject.findOne({ _id: fields.subject, levels: fields.level, deletedAt: { $exists: false } }).lean(),
    Tenant.findByTenantId(tenantId),
  ]);

  if (
    !userTenants.includes(tenantId) ||
    !tenant.services.includes(TENANT.SERVICE.QUESTION) ||
    (config.mode === 'SATELLITE' && inputTutors.length !== 1)
  )
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  if (
    !Object.keys(QUESTION.LANG).includes(fields.lang) ||
    !level ||
    !subject ||
    (fields.book && !book) ||
    (fields.classroom && !classroom) ||
    (fields.homework && !homework) ||
    (inputTutors.length !== tutors.length && tutors.length > 0)
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const flags = userFlags.includes(USER.FLAG.EDA) ? [QUESTION.FLAG.EDA] : [];

  const tutorIds = idsToString(tutors);
  const isBidding = tutors.length != 1;
  const members: Member[] = [{ user: userId, flags: [], lastViewedAt: new Date() }];
  if (!isBidding) members.push(...tutorIds.map(user => ({ user, flags: [] })));

  const bids = isBidding ? tutorIds.map(_ => new Bid<Partial<BidDocument>>({ messages: [] })) : [];

  const question = new Question<Partial<QuestionDocument>>({
    tenant: tenantId,
    flags,
    students: [userId],
    ...(isBidding ? { tutors: [], bidders: tutorIds } : { tutors: tutorIds, bidders: [] }),
    members,
    bids,
    ...fields,
  });
  const id = question._id.toString();
  const content = new Content<Partial<ContentDocument>>({ parents: [`/questions/${id}`], creator: userId, data });
  question.content = content;

  const userIds = [userId, ...tutorIds];

  await Promise.all([
    question.save(),
    content.save(),
    ...bids.map(bid => bid.save()),
    DatabaseEvent.log(userId, `/questions/${id}`, 'CREATE', { question: fields }),
    notify(userIds, 'QUESTION', { questionIds: [id], contentIds: [content._id.toString()] }),
    syncSatellite({ tenantId, userIds }, { questionIds: [id], contentIds: [content._id.toString()] }),
    censor(tenantId, `/questions/${id}`, content, userLocale),
  ]);

  return question.populate([{ path: 'content', select: select() }]);
  // (await findAndPopulate('student', { _id: id }, userId))[0];
};

/**
 * Create New Question
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, req.body) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple Question (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<QuestionDocument>[]> => {
  const { userId } = auth(req);
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<QuestionDocument>([], { query });

  const allQuestions = await Promise.all([
    findAndPopulate('student', filter, userId),
    findAndPopulate('tutor', filter, userId),
    findAndPopulate('bidder', filter, userId),
  ]);

  return allQuestions.flat().sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

/**
 * Find Multiple Question with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = auth(req);
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<QuestionDocument>(
      [],
      { query },
      { $or: [{ students: userId }, { tutors: userId }, { bidders: userId }] },
    );
    const options = paginateSort(req.query, { updatedAt: -1 });

    const [total, questions] = await Promise.all([
      Question.countDocuments(filter),
      Question.find(filter, select(), options).lean(),
    ]);

    // single mongoose population is slower, but preserve the sort-order
    const populatedQuestions = await Promise.all(
      questions.map(async ({ _id, students, tutors }) =>
        findAndPopulate(
          idsToString(students).includes(userId)
            ? 'student'
            : idsToString(tutors).includes(userId)
            ? 'tutor'
            : 'bidder',
          { _id },
          userId,
        ),
      ),
    );

    res.status(200).json({ meta: { total, ...options }, data: populatedQuestions.flat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Question by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<QuestionDocument> | null> => {
  const { userId } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);
  const filter = searchFilter<QuestionDocument>(
    [],
    { query },
    { _id: id, $or: [{ students: userId }, { tutors: userId }, { bidders: userId }] },
  );
  const question = await Question.findOne(filter, select()).lean();

  if (!question) return null;

  return findOneAndPopulate(question, userId); // read-back with populated
};

/**
 * Find One Question by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const question = await findOne(req, { id: req.params.id });
    question ? res.status(200).json({ data: question }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete by ID
 * ONLY students could delete/cancel at bidding stage (without tutors)
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { id } = await idSchema.validate(args);

  const question = await Question.findOneAndUpdate(
    { _id: id, students: userId, 'tutors.0': { $exists: false }, deletedAt: new Date() },
    { bidders: [], bids: [], deletedAt: new Date() },
  ).lean();

  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = [userId, ...question.bidders];
  await Promise.all([
    Bid.deleteMany({ _id: { $in: question.bids } }),
    DatabaseEvent.log(userId, `/questions/${id}`, 'DELETE', {}),
    notify(userIds, 'QUESTION', { questionIds: [id] }), // just mark question deleted, keep content untouched
    syncSatellite({ tenantId: question.tenant, userIds }, { questionIds: [id] }),
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
 * Update Question
 * addContent, shareTo
 *
 */
const update = async (req: Request, args: unknown): Promise<LeanDocument<QuestionDocument>> => {
  const { userId, userLocale } = auth(req);
  const fields = await questionUpdateSchema.validate(args);
  const { id, content: data, timeSpent, pay, shareTo } = fields;

  const question = await Question.findOne({
    _id: id,
    $or: [{ students: userId }, { tutors: userId }],
    deletedAt: { $exists: false },
  }).lean();

  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (!(data || !shareTo)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // share to classroomId or another chatGroupId
  if (shareTo) {
    const { model, id: shareToId, parentDoc } = await checkOwnership(userId, shareTo, 'ADMIN_TEACHER');

    const contentIds = idsToString([question.content, ...question.contents]);

    const chat = new Chat<Partial<ChatDocument>>({
      parents: [`/${model}/${shareToId}`],
      title: 'Sharing student homework',
      members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
      contents: contentIds,
    });
    if (model === 'chatGroups') {
      const ids: ChatResponse = {
        chatGroupIds: [id],
        chatIds: [chat._id.toString()],
        contentIds,
      };
      const userIds = [userId, ...idsToString(parentDoc.users)];
      await Promise.all([
        chat.save(),
        Content.updateMany({ _id: { $in: contentIds } }, { $push: { parents: `/chats/${chat._id}` } }),
        ChatGroup.findByIdAndUpdate(shareToId, { $push: { chats: chat } }).lean(),
        DatabaseEvent.log(userId, `/chatGroups/${shareToId}`, 'SHARE', {
          event: `sharing question (${id}) to chatGroup (${shareToId})`,
        }),
        notify(userIds, 'CHAT-GROUP', ids),
        syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids),
      ]);
    } else {
      const ids: ChatResponse = {
        classroomIds: [id],
        chatIds: [chat._id.toString()],
        contentIds,
      };
      const userIds = [userId, ...idsToString(parentDoc.teachers), ...idsToString(parentDoc.students)];
      await Promise.all([
        chat.save(),
        Content.updateMany({ _id: { $in: contentIds } }, { $push: { parents: `/chats/${chat._id}` } }),
        Classroom.findById(shareToId, { $push: { chats: chat } }).lean(),
        DatabaseEvent.log(userId, `/classrooms/${shareToId}`, 'SHARE', {
          event: `sharing homework (${id}) to classroom (${shareToId})`,
        }),
        notify(userIds, 'CLASSROOM', ids),
        syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids),
      ]);
    }
  } else {
    // addContent

    const isOwner = idsToString(question.students).includes(userId);
    const content = data
      ? new Content<Partial<ContentDocument>>({ parents: [`/questions/${id}`], creator: userId, data })
      : null;

    // TODO: EOL
    // const questionUpdate = merge.all<UpdateQuery<QuestionDocument>>([
    //   content ? { $push: { contents: content } } : {},
    //   !isOwner && timeSpent ? { timeSpent } : {},
    //   isOwner && ranking ? { ranking } : {},
    //   isOwner && pay && !question.paidAt ? { paidAt: new Date() } : {},
    // ]);
    const questionUpdate = {
      ...(content && { $push: { contents: content } }),
      ...(isOwner && timeSpent && { timeSpent }),
      ...(isOwner && pay && !question.paidAt && { paidAt: new Date() }),
    };

    const ids: DocumentSync = {
      questionIds: [id],
      contentIds: content ? [content._id.toString()] : [],
    };
    const userIds = [...question.students, ...question.tutors];

    await Promise.all([
      isOwner && pay && !question.paidAt && console.log('TODO: run pay()'), //TODO! run pay()
      Question.findByIdAndUpdate(id, questionUpdate).lean(),
      content?.save(),
      DatabaseEvent.log(userId, `/questions/${id}`, 'UPDATE', { question: fields }),
      notify(userIds, 'QUESTION', ids),
      syncSatellite({ tenantId: question.tenant, userIds }, ids),
      content && censor(question.tenant, `/questions/${id}`, content, userLocale),
    ]);
  }
  return findOneAndPopulate(question, userId); // read-back with populated
};

/**
 * Update Flag
 * note: students & tutors could update flag
 */
const updateFlag = async (req: Request, args: unknown, action: Action): Promise<LeanDocument<QuestionDocument>> => {
  const { userId } = auth(req);
  const { id, flag } = await flagSchema.concat(idSchema).validate(args);

  if (!Object.keys(QUESTION.MEMBER.FLAG).includes(flag)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const question =
    action === 'setFlag'
      ? await Question.findOneAndUpdate(
          {
            _id: id,
            $or: [{ students: userId }, { tutors: userId }],
            members: { $elemMatch: { user: userId, flags: { $ne: flag } } },
            deletedAt: { $exists: false },
          },
          { $push: { 'members.$.flags': flag }, $set: { 'members.$.lastViewedAt': new Date() } },
        ).lean()
      : await Question.findOneAndUpdate(
          {
            _id: id,
            $or: [{ students: userId }, { tutors: userId }],
            members: { $elemMatch: { user: userId, flags: flag } },
            deletedAt: { $exists: false },
          },
          { $pull: { 'members.$.flags': flag }, $set: { 'members.$.lastViewedAt': new Date() } },
        ).lean();

  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return findOneAndPopulate(question, userId); // read-back with populated
};

/**
 * Update LastViewedAt
 */
const updateLastViewedAt = async (req: Request, args: unknown): Promise<LeanDocument<QuestionDocument>> => {
  const { userId } = auth(req);
  const { id, timestamp = Date.now() } = await idSchema.concat(optionalTimestampSchema).validate(args);

  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      $or: [{ students: userId }, { tutors: userId }],
      'members.user': userId,
      deletedAt: { $exists: false },
    },
    { $set: { 'members.$.lastViewedAt': timestamp } },
  ).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return findOneAndPopulate(question, userId); // read-back with populated
};

/**
 * updateMembers
 * note: student could add students, tutor could add tutors
 */
const updateMembers = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'addStudents' | 'addTutors'>,
): Promise<LeanDocument<QuestionDocument>> => {
  const { userId } = auth(req);
  const { id, userIds } = await idSchema.concat(userIdsSchema).validate(args);
  const uniqueUserIds = Array.from(new Set(userIds)); // remove duplicated userIds,

  const question = await Question.findOne({
    _id: id,
    $or: [{ students: userId }, { tutors: userId }],
    deletedAt: { $exists: false },
  }).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userCount = await User.countDocuments({ _id: { $in: uniqueUserIds }, tenants: question.tenant });
  if (userCount !== userIds.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const newUsers =
    action === 'addStudents'
      ? uniqueUserIds.filter(x => !idsToString(question.students).includes(x))
      : uniqueUserIds.filter(x => !idsToString(question.tutors).includes(x));

  const notifyUserIds = [...idsToString(question.students), ...idsToString(question.tutors), ...newUsers, userId];

  await Promise.all([
    Question.findByIdAndUpdate(
      id,
      action === 'addStudents'
        ? { $push: { students: { $each: newUsers } } }
        : { $push: { tutors: { $each: newUsers } } },
    ).lean(),
    DatabaseEvent.log(userId, `/questions/${id}`, 'UPDATE', { action, question, userIds }),
    notify(notifyUserIds, 'QUESTION', { questionIds: [id] }),
    syncSatellite({ tenantId: question.tenant, userIds: notifyUserIds }, { questionIds: [id] }),
  ]);

  return findOneAndPopulate(question, userId); // read-back with populated
};

/**
 * Update Tutor Ranking
 * note: only students could update ranking
 */
const updateTutorRanking = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { id, correctness, explicitness, punctuality } = await idSchema.concat(rankingSchema).validate(args);

  if (!correctness || !punctuality || !explicitness) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const question = await Question.findOne({ _id: id, students: userId, deletedAt: { $exists: false } }).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { tenant, tutors, lang, level, subject } = question;

  const rankings = await Promise.all(
    tutors.map(async tutor =>
      TutorRanking.findOneAndUpdate(
        { tenant, tutor, student: userId, question: id },
        { tenant, tutor, student: userId, question: id, lang, level, subject, correctness, explicitness, punctuality },
        { fields: '_id', upsert: true, new: true },
      ).lean(),
    ),
  );

  await syncSatellite({ tenantId: tenant }, { rankingIds: idsToString(rankings) });

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Update Chat (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, ...req.body }) });
      case 'addStudents':
      case 'addTutors':
        return res.status(200).json({ data: await updateMembers(req, { id, ...req.body }, action) });
      case 'bid':
        return res.status(200).json({ data: await bid(req, { id, ...req.body }) });
      case 'clearFlag':
      case 'setFlag':
        return res.status(200).json({ data: await updateFlag(req, { id, ...req.body }, action) });
      case 'updateTutorRanking':
        return res.status(200).json({ data: await updateTutorRanking(req, { id, ...req.body }) });
      case 'updateLastViewedAt':
        return res.status(200).json({ data: await updateLastViewedAt(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  bid,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  remove,
  removeById,
  update,
  updateById,
  updateLastViewedAt,
};
