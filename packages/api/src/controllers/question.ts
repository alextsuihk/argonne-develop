/**
 * Controller: Question
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { subDays } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import Book from '../models/book';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import Homework from '../models/homework';
import Level from '../models/level';
import type { QuestionDocument } from '../models/question';
import Question from '../models/question';
import Subject from '../models/subject';
import Tenant, { findSatelliteTenants } from '../models/tenant';
import User from '../models/user';
import { mongoId } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';
import { censorContent, signContentIds } from './content';

type Action =
  | 'addBidContent'
  | 'addBidders'
  | 'addContent'
  | 'assignTutor'
  | 'clearFlag'
  | 'clone'
  | 'close'
  | 'setFlag'
  | 'updateLastViewedAt'
  | 'updateRanking'
  | 'updatePrice';

type QuestionDocumentEx = Omit<QuestionDocument, 'contentIdx'> & { contentsToken: string };

type Role = 'student' | 'tutor' | 'bidders' | 'marshals';

const { MSG_ENUM } = LOCALE;
const { QUESTION, TENANT, USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authCheckUserSuspension, paginateSort, searchFilter, select } = common;
const { DEFAULTS } = configLoader;
const {
  contentSchema,
  flagSchema,
  idSchema,
  optionalFlagSchema,
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
const findOneQuestion = async (id: string, userId: Types.ObjectId, userTenants: string[], roles: Role[]) => {
  const roleFilter: { [key in Role]?: Types.ObjectId }[] = [];
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
 * (helper) conditionally hide bidders & bids info, and generate contentsToken
 *
 * note: not everyone needs bids, therefore, populating is done in transform()
 */
const transform = async (
  userId: Types.ObjectId,
  { contentIdx, ...question }: QuestionDocument,
): Promise<QuestionDocumentEx> => {
  const isStudent = [question.student, ...question.marshals].some(u => u.equals(userId)); // either student or marshal
  const isTutor = question.tutor?.equals(userId);

  const members = isStudent
    ? question.members
    : question.members.filter(m => m.user.equals(userId) || m.user.equals(question.student)); // only able to see himself & student
  const contents = isStudent || isTutor ? question.contents : question.contents.slice(0, contentIdx); // student (marshal) & tutor see all contents, bidders see first few
  const bids = question.bids.filter(bid => isStudent || bid.bidder.equals(userId)); // student could access all bids, bidder only gets her bid

  return {
    ...question,
    members,
    tutor: !question.tutor || isStudent || isTutor ? question.tutor : question.student, // for bidders' prospective, once tutor is assigned, bidders see tutor = student (hiding tutor identity)
    bidders: isStudent ? question.bidders : question.bidders.length ? [userId] : [],
    bids,
    contents,
    contentsToken: await signContentIds(userId, [...contents, ...bids.map(bid => bid.contents).flat()]),
  };
};

/**
 * addBidContent
 * student or bidders could update bidContent/message as long as tutor has not been assigned
 */
const addBidContent = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userLocale, userTenants } = auth(req);
  const {
    id,
    content: data,
    userId: bidderId,
  } = await contentSchema.concat(idSchema).concat(userIdSchema).validate(args);

  const original = await findOneQuestion(id, userId, userTenants, ['bidders', 'student']);
  if (original.tutor || !original.bidders.some(b => b.equals(bidderId)))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // once tutor is assigned, no more bidding; bidderId must be one of the bidders
  if (!original.flags.includes(QUESTION.FLAG.SCHOOL)) await authCheckUserSuspension(req);

  const content = new Content<Partial<ContentDocument>>({
    parents: [`/questions/${id}/${bidderId}`],
    creator: userId,
    data,
  });

  const [question] = await Promise.all([
    Question.findByIdAndUpdate(
      id,
      {
        ...(original.members.some(m => m.user.equals(userId))
          ? {
              members: original.members.map(m => (m.user.equals(userId) ? { ...m, lastViewedAt: new Date() } : m)),
            }
          : { members: { user: userId, flags: [], lastViewedAt: new Date() } }),
        ...(original.bids.some(bid => bid.bidder.equals(bidderId))
          ? {
              bids: original.bids.map(bid =>
                bid.bidder.equals(bidderId) ? { ...bid, contents: [...bid.contents, content._id] } : bid,
              ),
            }
          : { bids: [...original.bids, { bidder: bidderId, contents: [content._id] }] }),
      },
      { fields: select(), new: true },
    ).lean(),
    content.save(),
    censorContent(original.tenant, userLocale, `/questions/${id}`, content._id),
    notifySync(
      original.tenant,
      { userIds: [original.student, ...original.bidders], event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [
            {
              updateOne: {
                filter: { _id: id, 'members.user': userId },
                update: { $max: { 'members.$.lastViewedAt': new Date() } },
              },
            },
            {
              updateOne: {
                filter: { _id: id, 'members.user': { $ne: userId } },
                update: { $push: { members: { user: userId, flags: [], lastViewedAt: new Date() } } },
              },
            },
            {
              updateOne: {
                filter: { _id: id, 'bids.bidder': bidderId },
                update: { $set: { 'bids.$.contents': content._id } },
              },
            },
            {
              updateOne: {
                filter: { _id: id, 'bids.bidder': { $ne: bidderId } },
                update: { $push: { bids: { bidder: bidderId, contents: [content._id] } } },
              },
            },
          ] satisfies BulkWrite<QuestionDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);

  if (question) return transform(userId, question);
  log('error', `questionController:addBidContent()`, args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addBidders
 * student adds more bidders (only add, no remove)
 */
const addBidders = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, userIds } = await idSchema.concat(userIdsSchema).validate(args);

  const original = await findOneQuestion(id, userId, userTenants, ['student']);
  const newBidders = await User.find({ _id: { $in: userIds }, tenants: original.tenant }, '_id').lean();
  const newBidderIds = newBidders.map(u => u._id);

  if (original.tutor || !newBidderIds.length || userIds.length !== newBidderIds.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const update: UpdateQuery<QuestionDocument> = { $addToSet: { bidders: { $each: newBidders.map(u => u._id) } } };
  const [question] = await Promise.all([
    Question.findByIdAndUpdate(id, update, { fields: select(), new: true }).lean(),
    notifySync(
      original.tenant,
      { userIds: [original.student, ...original.bidders, ...newBidderIds], event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<QuestionDocument>,
        },
      },
    ),
  ]);

  if (question) return transform(userId, question);
  log('error', 'questionController:addBidders()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addContent (optional with dispute)
 *
 * student, tutor or marshals could addContent
 */
const addContent = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userLocale, userTenants } = auth(req);
  const {
    id,
    content: data,
    flag,
    timeSpent,
    visibleAfter,
  } = await contentSchema.concat(idSchema).concat(optionalFlagSchema).concat(optionalTimeSpentSchema).validate(args);

  if (flag && flag !== QUESTION.FLAG.DISPUTED) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // only accept optional DISPUTED flag

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

  const update: UpdateQuery<QuestionDocument> = {
    members: original.members.map(m => (m.user.equals(userId) ? { ...m, lastViewedAt: new Date() } : m)),
    $push: { contents: content },
    ...(!original.tutor && { $inc: { contentIdx: 1 } }), // increment publicly visible contentIndex before tutor is assigned
    ...(original.tutor && timeSpent && { timeSpent }),
    ...(flag && { $addToSet: { flags: QUESTION.FLAG.DISPUTED } }),
  };
  const [question] = await Promise.all([
    Question.findByIdAndUpdate(id, update, { fields: select(), new: true }).lean(),
    // transform(userId, question),
    content.save(),
    censorContent(original.tenant, userLocale, `/questions/${id}`, content._id),
    notifySync(
      original.tenant,
      { userIds, event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [
            { updateOne: { filter: { _id: id }, update } },
            {
              updateOne: {
                filter: { _id: id, 'members.user': userId },
                update: { $max: { 'members.$.lastViewedAt': new Date() } },
              },
            },
            {
              updateOne: {
                filter: { _id: id, 'members.user': { $ne: userId } },
                update: { $push: { members: { user: userId, flags: [], lastViewedAt: new Date() } } },
              },
            },
          ] satisfies BulkWrite<QuestionDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);

  if (question) return transform(userId, question);
  log('error', `questionController:addContent()`, args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * assignTutor
 * student assigns one of the bidders to be tutor
 */
const assignTutor = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, userId: bidderId } = await idSchema.concat(userIdSchema).validate(args);

  const update: UpdateQuery<QuestionDocument> = { tutor: mongoId(bidderId) };
  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      student: userId,
      tutor: { $exists: false },
      bidders: bidderId,
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] }, // just be consistent with findOneQuestion()
      deletedAt: { $exists: false },
    },
    update,
    { fields: select(), new: true },
  ).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [transformed] = await Promise.all([
    transform(userId, question),
    notifySync(
      question.tenant,
      { userIds: [question.student, ...question.bidders], event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<QuestionDocument>,
        },
      },
    ),
  ]);

  return transformed;
};

const pay = async (question: QuestionDocument): Promise<QuestionDocument> => {
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
 *  close & optionally pay (by student)
 *  if tutor is assign
 *
 */
const close = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);

  const update: UpdateQuery<QuestionDocument> = { $addToSet: { flags: QUESTION.FLAG.CLOSED } };
  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      student: userId,
      tutor: { $exists: true },
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] },
      deletedAt: { $exists: false },
    },
    update,
    { fields: select(), new: true },
  ).lean();
  if (!question || !question.tutor) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // const updatedQuestion =  question.bounty ? await pay(question) : question

  const [transformed] = await Promise.all([
    transform(userId, question.bounty ? await pay(question) : question),
    notifySync(
      question.tenant,
      { userIds: [question.student, question.tutor], event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<QuestionDocument>, // special: satellite only has free question, no need to sync PAID
        },
      },
    ),
  ]);

  return transformed;
};

/**
 * close (or pay) questions by scheduler
 *  ! note: school questions are always free, tutoring paid questions exists in hub mode
 */
const closeByScheduler = async (): Promise<void> => {
  const [payingQuestions, closingQuestions, satellites] = await Promise.all([
    Question.find({
      bounty: { $exists: true },
      tutor: { $exists: true },
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.DISPUTED, QUESTION.FLAG.PAID, QUESTION.FLAG.SCHOOL] },
      deletedAt: { $exists: false },
      updatedAt: {
        $lt: subDays(Date.now(), DEFAULTS.QUESTION.CLOSE_DAYS),
        $gt: subDays(Date.now(), DEFAULTS.QUESTION.CLOSE_DAYS + 14),
      },
    }).lean(),
    Question.find(
      {
        $or: [{ bounty: { $exists: false } }, { tutor: { $exists: false } }],
        flags: { $ne: QUESTION.FLAG.CLOSED },
        deletedAt: { $exists: false },
        updatedAt: {
          $lt: subDays(Date.now(), DEFAULTS.QUESTION.CLOSE_DAYS),
          $gt: subDays(Date.now(), DEFAULTS.QUESTION.CLOSE_DAYS + 14),
        },
      }, // close for free question & question without tutor
    ),
    findSatelliteTenants('queue'),
  ]);

  const update: UpdateQuery<QuestionDocument> = { $addToSet: { flags: QUESTION.FLAG.CLOSED } };
  await Promise.all([
    Question.updateMany({ _id: { $in: closingQuestions }, update }),

    // push mongo updates to satellites (no need to push notification [not that urgent, let React client polling to handle])
    ...satellites.map(async tenant => {
      const questionIds = [...payingQuestions, ...closingQuestions]
        .filter(question => tenant._id.equals(question.tenant))
        .map(q => q._id);

      if (questionIds.length)
        await notifySync(tenant._id, null, {
          bulkWrite: {
            questions: [
              { updateMany: { filter: { _id: { $in: questionIds } }, update } },
            ] satisfies BulkWrite<QuestionDocument>,
          },
        });
    }),

    // execute pay()
    ...payingQuestions.map(async question => {
      const contents = await Content.find({ id: { $in: question.contents } }, '-data').lean(); // data is too big, and not needed
      if (contents.some(c => question.tutor?.equals(c.creator))) await pay(question); // pay IF tutor has at least a single content
    }),
  ]);
};

/**
 * clone
 * student clones (re-ask/reconfirm someones else)
 * all contents will be attached (updating content's parents)
 */
const clone = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId } = auth(req);
  const { id, userIds: uIds } = await idSchema.concat(userIdsSchema).validate(args);

  const original = await Question.findOne({ _id: id, student: userId }).lean(); // student could always find even deleted
  const users = original && (await User.find({ _id: { $in: uIds }, tenants: original.tenant }, '_id').lean());
  if (!original || !uIds.length || users?.length !== uIds.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = users.map(u => u._id);
  const question = new Question<Partial<QuestionDocument>>({
    ...original,
    _id: mongoId(),
    parent: original._id,
    ...(users.length == 1 && users[0] ? { tutor: users[0]._id, bidders: [] } : { bidders: users.map(u => u._id) }),
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    contentIdx: original.contents.length,
  });

  const contentUpdate: UpdateQuery<ContentDocument> = { $push: { parents: `/questions/${question._id}` } };
  const [transformed] = await Promise.all([
    transform(userId, question.toObject()),
    question.save(),
    Content.updateMany({ _id: { $in: original.contents } }, contentUpdate),
    notifySync(
      question.tenant,
      { userIds: [userId, ...userIds], event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [{ insertOne: { document: question } }] satisfies BulkWrite<QuestionDocument>,
          contents: [
            { updateMany: { filter: { _id: { $in: original.contents } }, update: contentUpdate } },
          ] satisfies BulkWrite<ContentDocument>,
        },
      },
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
  const { tenantId, userIds: uIds, content: data, ...inputFields } = await questionSchema.validate(args);

  const [users, book, classroom, homework, level, subject, tenant] = await Promise.all([
    User.find({ _id: { $in: uIds }, tenants: tenantId }, '_id').lean(),
    inputFields.book
      ? Book.exists({ _id: inputFields.book, level: inputFields.level, subjects: inputFields.subject })
      : null,
    inputFields.classroom ? Classroom.findOne({ _id: inputFields.classroom, students: userId }).lean() : null,
    inputFields.homework
      ? Homework.findOne({ _id: inputFields.homework, user: userId, deletedAt: { $exists: false } }).lean()
      : null,
    Level.exists({ _id: inputFields.level, deletedAt: { $exists: false } }),
    Subject.exists({ _id: inputFields.subject, levels: inputFields.level, deletedAt: { $exists: false } }),
    Tenant.findByTenantId(tenantId),
  ]);
  // ! the following is a better logic, unfortunately, JEST does not support this logic, will need React to handle the logic
  // const userIds = tenant.school ? classroom?.teachers || [] : users.map(u => u._id); // for school tenant, could only ask classroom.teachers
  const userIds = users.map(u => u._id);

  if (
    !userTenants.includes(tenantId) ||
    (!tenant.services.includes(TENANT.SERVICE.TUTOR) && !tenant.services.includes(TENANT.SERVICE.CLASSROOM))
  )
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  if (!tenant.school) await authCheckUserSuspension(req); // check for user suspension if not school tenant

  if (
    !Object.keys(QUESTION.LANG).includes(inputFields.lang) ||
    !userIds.length ||
    userIds.some(u => u.equals(userId)) || // you should ask yourself
    (inputFields.book && !book) ||
    (inputFields.classroom && !classroom) ||
    (inputFields.homework && !homework) ||
    !level ||
    !subject ||
    (!tenant.services.includes(TENANT.SERVICE.QUESTION_BID) && userIds.length !== 1) ||
    inputFields.deadline.getTime() < Date.now()
  )
    throw { statusCode: 4223333, code: MSG_ENUM.USER_INPUT_ERROR };

  const flags: string[] = [];
  if (userFlags.includes(USER.FLAG.EDA)) flags.push(QUESTION.FLAG.EDA);
  if (tenant.school) flags.push(QUESTION.FLAG.SCHOOL);
  if (tenant.school || userIds.length === 1) inputFields.bounty = 0;

  const question = new Question<Partial<QuestionDocument>>({
    ...inputFields,
    tenant: tenant._id,
    flags,
    student: userId,
    ...(users.length == 1 && users[0] ? { tutor: users[0]._id, bidders: [] } : { bidders: users.map(u => u._id) }),
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    classroom: classroom?._id,
    level: level._id,
    subject: subject._id,
    book: book?._id,
    assignment: homework?.assignment,
    homework: homework?._id,
  });
  const { _id } = question;
  const content = new Content<Partial<ContentDocument>>({
    parents: [`/questions/${_id}`],
    creator: userId,
    data,
  });
  question.contents = [content._id];
  question.contentIdx = 1;

  const [transformed] = await Promise.all([
    transform(userId, question.toObject()),
    homework && Homework.findByIdAndUpdate(homework, { $push: { questions: _id } }).lean(),
    question.save(),
    content.save(),
    censorContent(question.tenant, userLocale, `/questions/${_id}`, content._id),
    notifySync(
      question.tenant,
      { userIds: [userId, ...userIds], event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [{ insertOne: { document: question } }] satisfies BulkWrite<QuestionDocument>,
        },
      },
    ),
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
const findCommon = async (userId: Types.ObjectId, args: unknown, getOne = false) => {
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

  const update: UpdateQuery<QuestionDocument> = { deletedAt: new Date(), $addToSet: { flags: QUESTION.FLAG.CLOSED } };
  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      student: userId,
      tutor: { $exists: false },
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] },
      deletedAt: { $exists: false },
    },
    update,
  ).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await notifySync(
    question.tenant,
    { userIds: [userId, ...question.bidders], event: 'QUESTION' },
    { bulkWrite: { questions: [{ updateOne: { filter: { _id: id }, update } }] as BulkWrite<QuestionDocument> } },
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

  const [question] = await Promise.all([
    original.members.some(m => m.user.equals(userId))
      ? Question.findOneAndUpdate(
          { _id: id, 'members.user': userId },
          action === 'setFlag'
            ? { 'members.$.lastViewedAt': new Date(), $addToSet: { 'members.$.flags': flag } }
            : { 'members.$.lastViewedAt': new Date(), $pull: { 'members.$.flags': flag } },
          { fields: select(), new: true },
        ).lean()
      : action === 'setFlag'
      ? Question.findOneAndUpdate(
          { _id: id, 'members.user': { $ne: userId } },
          { $push: { members: { user: userId, flags: [flag], lastViewedAt: new Date() } } },
          { fields: select(), new: true },
        ).lean()
      : null,

    notifySync(
      original.tenant,
      { userIds: [userId], event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [
            {
              updateOne: {
                filter: { _id: id, 'members.user': userId },
                update: {
                  $max: { 'members.$.lastViewedAt': new Date() },
                  ...(action === 'setFlag'
                    ? { $addToSet: { 'members.$.flags': flag } }
                    : { $pull: { 'members.$.flags': flag } }),
                },
              },
            },
            ...(action === 'setFlag'
              ? [
                  {
                    updateOne: {
                      filter: { _id: id },
                      update: { $push: { members: { user: userId, flags: [flag], lastViewedAt: new Date() } } },
                    },
                  },
                ]
              : []),
          ] satisfies BulkWrite<QuestionDocument>,
        },
      },
    ),
  ]);

  if (question) return transform(userId, question);
  log('error', `questionController:${action}()`, args, userId);
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
    original.members.some(m => m.user.equals(userId))
      ? Question.findOneAndUpdate(
          { _id: id, 'members.user': userId },
          { $set: { 'members.$.lastViewedAt': timestamp } },
          { fields: select(), new: true },
        ).lean()
      : Question.findOneAndUpdate(
          { _id: id },
          { $push: { members: { user: userId, flags: [], lastViewedAt: timestamp } } },
          { fields: select(), new: true },
        ).lean(),

    notifySync(
      original.tenant,
      { userIds, event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [
            {
              updateOne: {
                filter: { _id: id, 'members.user': userId },
                update: { $max: { 'members.$.lastViewedAt': new Date() } },
              },
            },
            {
              updateOne: {
                filter: { _id: id, 'members.user': { $ne: userId } },
                update: { $push: { members: { user: userId, flags: [], lastViewedAt: new Date() } } },
              },
            },
          ] satisfies BulkWrite<QuestionDocument>,
        },
      },
    ),
  ]);

  if (question) return transform(userId, question);
  log('error', 'questionController:updateLastViewedAt()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Ranking
 * note: student could update ranking
 */
const updateRanking = async (req: Request, args: unknown): Promise<QuestionDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, correctness, explicitness, punctuality } = await idSchema.concat(rankingSchema).validate(args);

  const update: UpdateQuery<QuestionDocument> = { correctness, explicitness, punctuality };
  const question = await Question.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      student: userId,
      flags: { $nin: [QUESTION.FLAG.CLOSED, QUESTION.FLAG.PAID] },
      deletedAt: { $exists: false },
    },
    update,
    { fields: select(), new: true },
  ).lean();
  if (!question) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [transformed] = await Promise.all([
    transform(userId, question),
    notifySync(
      question.tenant,
      { userIds: [userId], event: 'QUESTION' },
      {
        bulkWrite: {
          questions: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<QuestionDocument>,
        },
      },
    ),
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
      case 'addContent':
        return res.status(200).json({ data: await addContent(req, { id, ...req.body }) });
      case 'assignTutor':
        return res.status(200).json({ data: await assignTutor(req, { id, ...req.body }) });
      case 'clearFlag':
      case 'setFlag':
        return res.status(200).json({ data: await updateFlag(req, { id, ...req.body }, action) });
      case 'clone':
        return res.status(200).json({ data: await clone(req, { id, ...req.body }) });
      case 'close':
        return res.status(200).json({ data: await close(req, { id, ...req.body }) });
      case 'updateLastViewedAt':
        return res.status(200).json({ data: await updateLastViewedAt(req, { id, ...req.body }) });
      case 'updatePrice':
        console.log(' WIP TODO');
        break;
      case 'updateRanking':
        return res.status(200).json({ data: await updateRanking(req, { id, ...req.body }) });
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
  // updatePrice,
  updateLastViewedAt,
  updateRanking,
};
