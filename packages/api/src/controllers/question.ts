/**
 * Controller: Question
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { subDays } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import Book from '../models/book';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import Homework from '../models/homework';
// import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
// import type { BidDocument, Id, Member, QuestionDocument } from '../models/question';
import type { Id, QuestionDocument } from '../models/question';
import Question from '../models/question';
import Subject from '../models/subject';
import Tenant from '../models/tenant';
import TutorRanking from '../models/tutor-ranking';
import User from '../models/user';
import { idsToString } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';
import { signContentIds } from './content';

type Action =
  | 'addBidContent'
  | 'addBidders'
  | 'addContentByStudent'
  | 'addContentByTutor'
  | 'assignTutor'
  | 'clearFlag'
  | 'clone'
  | 'close'
  | 'dispute'
  | 'setFlag'
  | 'updateLastViewedAt'
  | 'updateRanking';

type QuestionDocumentEx = Omit<QuestionDocument & Id, 'contentIdx'> & { contentsToken: string };

type Role = 'student' | 'tutor' | 'bidders' | 'marshals';

const { MSG_ENUM } = LOCALE;
const { QUESTION, TENANT, USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authCheckUserSuspension, censorContent, paginateSort, searchFilter, select } = common;
const { DEFAULTS } = configLoader;
const {
  contentSchema,
  flagSchema,
  idSchema,
  optionalTimestampSchema,
  optionalTimeSpentSchema,
  questionSchema,
  querySchema,
  rankingSchema,
  userIdSchema,
  userIdsSchema,
} = yupSchema;

/**
 * (helper) findOne active question
 */
const findOneQuestion = async (id: string, userId: string, userTenants: string[], roles: Role[]) => {
  const roleFilter: { [key in Role]?: string }[] = [];
  if (roles.includes('student')) roleFilter.push({ student: userId });
  if (roles.includes('tutor')) roleFilter.push({ tutor: userId });
  if (roles.includes('bidders')) roleFilter.push({ bidders: userId });
  if (roles.includes('marshals')) roleFilter.push({ marshals: userId });

  const question = roles.length
    ? await Question.findOne({
        _id: id,
        tenant: { $in: userTenants },
        $or: roleFilter, // $or: [{ student: userId }, { tutor: userId }, { bidder: userId }, { marshals: userId }],
        flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] },
        deletedAt: { $exists: false },
      }).lean()
    : null;
  if (question) return question;

  throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
};

/**
 * (helper) conditionally hide bidders & bidContents info, and generate contentsToken
 */
const transform = async (
  userId: string,
  { contentIdx, ...question }: QuestionDocument & Id,
): Promise<QuestionDocumentEx> => {
  const isStudent = question.student.toString() === userId || idsToString(question.marshals).includes(userId);
  const isTutor = question.tutor === userId;
  const bidIndex = idsToString(question.bidders).findIndex(v => v === userId);
  const bidders = isStudent ? question.bidders : question.bidders.filter((_, idx) => bidIndex === idx); // optionally, hide private info
  const bidContents = isStudent ? question.bidContents : question.bidContents.filter((_, idx) => bidIndex === idx);
  const contents = isStudent || isTutor ? question.contents : question.contents.slice(0, contentIdx);

  return {
    ...question,
    bidders,
    bidContents,
    contents,
    contentsToken: await signContentIds(userId, idsToString([...contents, ...bidContents.flat()])),
  };
};

/**
 * addBidContent
 * student or bidders could update bidContent/message as long as tutor has not been assigned
 * student could see all bidContents
 * individual bidder ONLY see his/her bidContents
 */
const addBidContent = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userLocale, userTenants } = auth(req);
  const {
    id,
    content: data,
    userId: bidderId,
  } = await contentSchema.concat(idSchema).concat(userIdSchema).validate(args);

  const original = await findOneQuestion(id, userId, userTenants, ['bidders', 'student', 'tutor']);
  if (!original.flags.includes(QUESTION.FLAG.SCHOOL)) await authCheckUserSuspension(req);

  const content = new Content<Partial<ContentDocument>>({ parents: [`/questions/${id}`], creator: userId, data });

  const [question] = await Promise.all([
    Question.findOneAndUpdate(
      { _id: id, bidders: bidderId },
      { $push: { 'bidContents.$': content } },
      { fields: select(), new: true },
    ).lean(),
    content.save(),
    notifySync(
      'QUESTION',
      { tenantId: original.tenant, userIds: [userId, bidderId] },
      { questionIds: [id], contentIds: [content] },
    ),
    censorContent(original.tenant, userId, userLocale, 'questions', id, content),
  ]);

  if (question) return transform(userId, question);
  log('error', `questionController:addBidContent()`, { id }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addBidders
 * student adds more bidders (not in original.bidders)
 */
const addBidders = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, userIds: newBidderIds } = await idSchema.concat(userIdsSchema).validate(args);

  const original = await findOneQuestion(id, userId, userTenants, ['student']);
  const newBidderCount = await User.countDocuments({ _id: { $in: newBidderIds }, tenants: original.tenant });

  if (
    original.tutor ||
    !newBidderIds.length ||
    newBidderCount !== newBidderIds.length ||
    idsToString(original.bidders).filter(x => newBidderIds.includes(x)).length
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [question] = await Promise.all([
    Question.findByIdAndUpdate(
      id,
      { $push: { bidders: { $each: newBidderIds }, bidContents: { $each: Array(newBidderIds).fill([]) } } },
      { fields: select(), new: true },
    ).lean(),
    notifySync(
      'QUESTION',
      { tenantId: original.tenant, userIds: [original.student, ...original.bidders, ...newBidderIds] },
      { questionIds: [id] },
    ),
  ]);

  if (question) return transform(userId, question);
  log('error', 'questionController:addBidders()', { id, newBidderIds }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addContent (optional with dispute)
 *
 * student, tutor or marshals could addContent
 */
const addContent = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'addContentByStudent' | 'addContentByTutor' | 'dispute'>,
): Promise<QuestionDocumentEx> => {
  const { userId, userLocale, userTenants } = auth(req);
  const {
    id,
    content: data,
    timeSpent,
    visibleAfter,
  } = await contentSchema.concat(idSchema).concat(optionalTimeSpentSchema).validate(args);

  const original = await findOneQuestion(id, userId, userTenants, ['marshals', 'student', 'tutor']);
  if (!original.flags.includes(QUESTION.FLAG.SCHOOL)) await authCheckUserSuspension(req);

  const content = new Content<Partial<ContentDocument>>({
    parents: [`/questions/${id}`],
    creator: userId,
    data,
    visibleAfter,
  });

  const userIds = [original.student];
  original.tutor ? userIds.push(original.tutor) : userIds.push(...original.bidders);
  const [question] = await Promise.all([
    Question.findByIdAndUpdate(
      id,
      {
        $push: { contents: content },
        ...(!original.tutor && { $inc: { contentIdx: 1 } }), // increment publicly visible contentIndex before tutor is assigned
        ...(action === 'addContentByTutor' && timeSpent && { timeSpent }),
        ...(action === 'dispute' && { $addToSet: { flags: QUESTION.FLAG.DISPUTED } }),
      },
      { fields: select(), new: true },
    ).lean(),
    // transform(userId, question),
    content.save(),
    notifySync('QUESTION', { tenantId: original.tenant, userIds }, { questionIds: [id], contentIds: [content] }),
    censorContent(original.tenant, userId, userLocale, 'questions', id, content),
  ]);

  if (question) return transform(userId, question);
  log('error', `questionController:${action}()`, { id }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * assignTutor
 * student assigns one of the bidders to be tutor
 */
const assignTutor = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, userId: bidderId } = await idSchema.concat(userIdSchema).validate(args);

  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      student: userId,
      tutor: { $exists: false },
      bidders: bidderId,
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] },
      deletedAt: { $exists: false },
    },
    { tutor: bidderId },
    { fields: select(), new: true },
  ).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [transformed] = await Promise.all([
    transform(userId, question),
    notifySync(
      'QUESTION',
      { tenantId: question.tenant, userIds: [question.student, ...question.bidders] },
      { questionIds: [id] },
    ),
  ]);

  return transformed;
};

const pay = async (question: QuestionDocument & Id): Promise<QuestionDocument & Id> => {
  const transaction = async () => {
    console.log('working transaction');
  };

  const [updated] = await Promise.all([
    Question.findByIdAndUpdate(
      question,
      { paidAt: new Date(), $addToSet: { flags: QUESTION.FLAG.PAID } },
      { fields: select(), new: true },
    ).lean(),
    transaction(),
  ]);

  if (updated) return updated;
  log('error', 'questionController:pay()', { id: question._id.toString() });
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * close or pay (by student)
 */
const close = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);

  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      student: userId,
      price: { $exists: true },
      tutor: { $exists: true },
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] },
      deletedAt: { $exists: false },
    },
    { $addToSet: { flags: QUESTION.FLAG.CLOSED } },
  );
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [transformed] = await Promise.all([
    transform(userId, question.price ? await pay(question) : question),
    notifySync(
      'QUESTION',
      { tenantId: question.tenant, userIds: [question.student, question.tutor!] },
      { questionIds: [id] },
    ),
  ]);
  return transformed;
};

/**
 * close (or pay) questions by scheduler
 */
const closeByScheduler = async (): Promise<void> => {
  const [payQuestions] = await Promise.all([
    Question.find({
      price: { $exists: true },
      tutor: { $exists: true },
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.DISPUTED, QUESTION.FLAG.PAID] },
      deletedAt: { $exists: false },
      updatedAt: {
        $lt: subDays(Date.now(), DEFAULTS.QUESTION.CLOSE_DAYS),
        $gt: subDays(Date.now(), DEFAULTS.QUESTION.CLOSE_DAYS + 14),
      },
    }).lean(),
    Question.updateMany(
      {
        $or: [{ price: { $exists: false } }, { tutor: { $exists: false } }],
        flags: { $ne: QUESTION.FLAG.CLOSED },
        deletedAt: { $exists: false },
        updatedAt: {
          $lt: subDays(Date.now(), DEFAULTS.QUESTION.CLOSE_DAYS),
          $gt: subDays(Date.now(), DEFAULTS.QUESTION.CLOSE_DAYS + 14),
        },
      },
      { $addToSet: { flags: QUESTION.FLAG.CLOSED } },
    ),
  ]);

  await Promise.all(
    payQuestions.map(async question => {
      const contents = await Content.find({ id: { $in: question.contents } }, '-data').lean(); // data is too big, and not needed

      await Promise.all([
        idsToString(contents.map(c => c.creator)).includes(question.tutor!.toString()) && pay(question), // pay IF tutor has at least a single content
        notifySync(
          'QUESTION',
          { tenantId: question.tenant, userIds: [question.student, question.tutor!] },
          { questionIds: [question] },
        ),
      ]);
    }),
  );
};

/**
 * clone
 * student clones (re-ask/reconfirm  someones else)
 */
const clone = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, userIds } = await idSchema.concat(userIdsSchema).validate(args);

  const original = await findOneQuestion(id, userId, userTenants, ['student']);
  const [originalContents, userCount] = await Promise.all([
    Content.find({ _id: { $in: original.contents } }).lean(),
    User.countDocuments({ _id: { $in: userIds }, tenants: original.tenant }),
  ]);
  if (!userIds.length || userCount !== userIds.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const question = new Question<Partial<QuestionDocument>>({
    ...original,
    parent: `/questions/${original._id}`,
    ...(userIds.length == 1 ? { tutor: userIds[0], bidders: [] } : { bidders: userIds }),
    bidContents: userIds.length == 1 ? [] : Array(userIds.length).fill([]), // construct bidContents empty array structure
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    contents: [],
  });
  const contents = originalContents.map(
    ({ creator, data }) =>
      new Content<Partial<ContentDocument>>({ parents: [`/questions/${question._id}`], creator, data }),
  );
  question.contents = idsToString(contents);

  const [transformed] = await Promise.all([
    transform(userId, question),
    question.save(),
    Content.create(contents),
    notifySync(
      'QUESTION',
      { tenantId: original.tenant, userIds: [userId, ...userIds] },
      { questionIds: [question], contentIds: contents },
    ),
  ]);

  return transformed;
};

/**
 * Create (ask) a question
 *
 * args.userIds.length === 1: assign to a tutor
 * args.userIds.length > 1: bidding
 *
 * note: userIds (tutor or bidders) cannot be userId himself
 */
const create = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userFlags, userId, userLocale, userTenants } = auth(req);
  const { tenantId, userIds, content: data, ...fields } = await questionSchema.validate(args);

  const [userCount, book, classroom, homework, level, subject, tenant] = await Promise.all([
    User.countDocuments({ _id: { $in: userIds }, tenants: tenantId }),
    fields.book && Book.exists({ _id: fields.book, level: fields.level, subjects: fields.subject }),
    fields.classroom && Classroom.exists({ _id: fields.classroom, students: userId }),
    fields.homework && Homework.exists({ _id: fields.homework, user: userId, deletedAt: { $exists: false } }),
    Level.exists({ _id: fields.level, deletedAt: { $exists: false } }),
    Subject.exists({ _id: fields.subject, levels: fields.level, deletedAt: { $exists: false } }),
    Tenant.findByTenantId(tenantId),
  ]);

  if (!userTenants.includes(tenantId) || !tenant.services.includes(TENANT.SERVICE.QUESTION))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  if (!tenant.school) await authCheckUserSuspension(req); // check for user suspension if not school tenant

  if (
    !Object.keys(QUESTION.LANG).includes(fields.lang) ||
    !userIds.length ||
    userIds.includes(userId) ||
    userIds.length !== userCount ||
    (fields.book && !book) ||
    (fields.classroom && !classroom) ||
    (fields.homework && !homework) ||
    !level ||
    !subject ||
    (!tenant.services.includes(TENANT.SERVICE.QUESTION_BID) && userIds.length !== 1) ||
    fields.deadline.getTime() < Date.now()
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const flags: string[] = [];
  if (userFlags.includes(USER.FLAG.EDA)) flags.push(QUESTION.FLAG.EDA);
  if (tenant.school) flags.push(QUESTION.FLAG.SCHOOL);

  const question = new Question<Partial<QuestionDocument>>({
    tenant: tenantId,
    flags,
    student: userId,
    ...(userIds.length == 1 ? { tutor: userIds[0], bidders: [] } : { bidders: userIds }),
    bidContents: userIds.length == 1 ? [] : Array(userIds.length).fill([]), // construct bidContents empty array structure
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    ...fields,
  });
  const { _id } = question;
  const content = new Content<Partial<ContentDocument>>({ parents: [`/questions/${_id}`], creator: userId, data });
  question.contents = [content._id];
  question.contentIdx = 1;

  const [transformed] = await Promise.all([
    transform(userId, question.toObject()),
    homework && Homework.findByIdAndUpdate(homework, { $push: { questions: _id } }).lean(),
    question.save(),
    content.save(),
    notifySync('QUESTION', { tenantId, userIds: [userId, ...userIds] }, { questionIds: [_id], contentIds: [content] }),
    censorContent(question.tenant, userId, userLocale, 'questions', _id, content),
  ]);

  return transformed;
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

// (helper) common code for find(), findMany(), findOne()
const findCommon = async (userId: string, args: unknown, getOne = false) => {
  const { id, query } = getOne
    ? await idSchema.concat(querySchema).validate(args)
    : { ...(await querySchema.validate(args)), id: null };

  return searchFilter<QuestionDocument>(
    [],
    { query },
    {
      ...(id && { _id: id }),
      $or: [{ student: userId }, { tutor: userId }, { bidders: userId }, { marshals: userId }],
    },
  );
};

/**
 * Find Multiple Question (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<QuestionDocumentEx[]> => {
  const { userId } = auth(req);
  const filter = await findCommon(userId, args);
  const questions = await Question.find(filter, select()).lean();

  return Promise.all(questions.map(async question => transform(userId, question)));
};

/**
 * Find Multiple Question with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = auth(req);
    const filter = await findCommon(userId, { query: req.query });
    const options = paginateSort(req.query, { updatedAt: -1 });

    const [total, questions] = await Promise.all([
      Question.countDocuments(filter),
      Question.find(filter, select(), options).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: await Promise.all(questions.map(async question => transform(userId, question))),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Question by ID
 */
const findOne = async (req: Request, args: unknown): Promise<QuestionDocumentEx | null> => {
  const { userId } = auth(req);
  const filter = await findCommon(userId, args, true);
  const question = await Question.findOne(filter, select()).lean();
  return question && transform(userId, question);
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
 * ONLY student could delete/cancel at bidding stage (without tutor)
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);

  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      student: userId,
      tutor: { $exists: false },
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] },
      deletedAt: { $exists: false },
    },
    { deletedAt: new Date(), $addToSet: { flags: QUESTION.FLAG.CLOSED } },
  ).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await notifySync(
    'QUESTION',
    { tenantId: question.tenant, userIds: [userId, ...question.bidders] },
    { questionIds: [id] },
  );
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
 * Update Flag
 * note: student & tutor could update flag
 */
const updateFlag = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'clearFlag' | 'setFlag'>,
): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, flag } = await flagSchema.concat(idSchema).validate(args);

  if (!Object.keys(QUESTION.MEMBER.FLAG).includes(flag)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const original = await findOneQuestion(id, userId, userTenants, ['student', 'tutor', 'marshals']);
  const member = original.members.find(m => m.user.toString() === userId);
  const updateMembers =
    action === 'clearFlag' && member?.flags.includes(flag)
      ? original.members.map(m => (m.user.toString() === userId ? { ...m, flags: m.flags.filter(f => f !== flag) } : m))
      : action === 'setFlag' && !member
      ? [...original.members, { user: userId, flags: [flag] }]
      : action === 'setFlag' && member && !member.flags.includes(flag)
      ? original.members.map(m => (m.user.toString() === userId ? { ...m, flags: [...m.flags, flag] } : m))
      : null;

  if (!updateMembers) return transform(userId, original);

  const [question] = await Promise.all([
    Question.findByIdAndUpdate(id, { members: updateMembers }, { fields: select(), new: true }).lean(),
    notifySync('QUESTION', { tenantId: original.tenant, userIds: [userId] }, { questionIds: [id] }),
  ]);
  if (question) return transform(userId, question);
  log('error', `questionController:${action}()`, { id, flag }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update LastViewedAt
 */
const updateLastViewedAt = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, timestamp = new Date() } = await idSchema.concat(optionalTimestampSchema).validate(args);

  const original = await findOneQuestion(id, userId, userTenants, ['student', 'tutor', 'bidders', 'marshals']);

  const userIds = [original.student];
  original.tutor ? userIds.push(original.tutor) : userIds.push(...original.bidders);
  const [question] = await Promise.all([
    Question.findByIdAndUpdate(
      id,
      original.members.find(m => m.user.toString() === userId)
        ? { members: original.members.map(m => (m.user.toString() === userId ? { ...m, lastViewedAt: timestamp } : m)) }
        : { members: [...original.members, { user: userId, flags: [], lastViewedAt: timestamp }] },
      { fields: select(), new: true },
    ).lean(),
    notifySync('QUESTION', { tenantId: original.tenant, userIds }, { questionIds: [id] }),
  ]);

  if (question) return transform(userId, question);
  log('error', 'questionController:updateLastViewedAt()', { id, timestamp }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Ranking
 * note: student could update ranking
 */
const updateRanking = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, correctness, explicitness, punctuality } = await idSchema.concat(rankingSchema).validate(args);

  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      student: userId,
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] },
      deletedAt: { $exists: false },
    },
    { correctness, explicitness, punctuality },
    { fields: select(), new: true },
  ).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { tenant, tutor, lang, level, subject } = question;
  const { _id } = await TutorRanking.findOneAndUpdate(
    { tenant, tutor, student: userId, question: id },
    { tenant, tutor, student: userId, question: id, lang, level, subject, correctness, explicitness, punctuality },
    { fields: '_id', upsert: true, new: true },
  ).lean();

  const [transformed] = await Promise.all([
    transform(userId, question),
    notifySync('QUESTION', { tenantId: tenant, userIds: [userId] }, { questionIds: [id], rankingIds: [_id] }),
  ]);

  return transformed;
};

/**
 * Update Question (RESTful)
 */
const updateById: RequestHandler<{ id: string; action: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case 'addBidContent':
        return res.status(200).json({ data: await addBidContent(req, { id, ...req.body }) });
      case 'addBidders':
        return res.status(200).json({ data: await addBidders(req, { id, ...req.body }) });
      case 'addContentByStudent':
      case 'addContentByTutor':
      case 'dispute':
        return res.status(200).json({ data: await addContent(req, { id, ...req.body }, action) });
      case 'assignTutor':
        return res.status(200).json({ data: await assignTutor(req, { id, ...req.body }) });
      case 'clearFlag':
      case 'setFlag':
        return res.status(200).json({ data: await updateFlag(req, { id, ...req.body }, action) });
      case 'clone':
        return res.status(200).json({ data: await clone(req, { id, ...req.body }) });
      case 'close':
        return res.status(200).json({ data: await close(req, { id, ...req.body }) });
      case 'updateRanking':
        return res.status(200).json({ data: await updateRanking(req, { id, ...req.body }) });
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
  addBidContent,
  addBidders,
  addContent,
  assignTutor,
  close,
  closeByScheduler,
  clone,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  remove,
  removeById,
  updateById,
  updateFlag,
  updateLastViewedAt,
};
