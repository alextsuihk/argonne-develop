/**
 * Controller: Homework
 *
 * ! note: homeworkController is ONLY for student access
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import type { AssignmentDocument } from '../models/assignment';
import Assignment, { searchableFields } from '../models/assignment';
import type { BookAssignmentDocument } from '../models/book';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import DatabaseEvent from '../models/event/database';
import type { HomeworkDocument } from '../models/homework';
import Homework from '../models/homework';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import common from './common';
import { signContentIds } from './content';

type Action = 'recallContent';

type Populate = {
  assignment: Omit<AssignmentDocument, 'bookAssignments'> & { bookAssignments: BookAssignmentDocument[] };
};
type PopulatedHomework = Omit<HomeworkDocument, 'assignment'> & Populate;
type HomeworkDocumentEx = PopulatedHomework & { contentsToken: string };

const { MSG_ENUM } = LOCALE;
const { CONTENT } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, paginateSort, searchFilter, select } = common;
const { contentIdSchema, homeworkSchema, idSchema, querySchema } = yupSchema;

// nested populate (with solutions hidden)
const populate = [
  { path: 'assignment', select: select(), populate: [{ path: 'bookAssignments', select: `${select()} -solutions` }] },
];

/**
 * (helper) generate contentsToken
 */
const transform = async (userId: Types.ObjectId, homework: PopulatedHomework): Promise<HomeworkDocumentEx> => ({
  ...homework,
  contentsToken: await signContentIds(
    userId,
    [...homework.contents, ...homework.assignment.bookAssignments.map(a => [a.content, ...a.examples])].flat(),
  ),
});

/**
 * Find Multiple Homeworks (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<HomeworkDocumentEx[]> => {
  const { userId } = auth(req);
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<HomeworkDocument>(searchableFields, { query }, { user: userId });
  const homeworks = await Homework.find(filter, select()).populate<Populate>(populate).lean();

  return Promise.all(homeworks.map(async homework => transform(userId, homework)));
};

/**
 * Find Multiple Homeworks with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = auth(req);
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<HomeworkDocument>(searchableFields, { query }, { user: userId });
    const options = paginateSort(req.query, { updatedAt: -1 });

    const [total, homeworks] = await Promise.all([
      Homework.countDocuments(filter),
      Homework.find(filter, select(), options).populate<Populate>(populate).lean(),
    ]);
    res.status(200).json({
      meta: { total, ...options },
      data: await Promise.all(homeworks.map(async homework => transform(userId, homework))),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Homework by ID
 */
const findOne = async (req: Request, args: unknown): Promise<HomeworkDocumentEx | null> => {
  const { userId } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<HomeworkDocument>([], { query }, { _id: id, user: userId });
  const homework = await Homework.findOne(filter, select()).populate<Populate>(populate).lean();
  return homework && transform(userId, homework);
};

/**
 * Find One Homework by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const homework = await findOne(req, { id: req.params.id });
    homework ? res.status(200).json({ data: homework }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Recall a homework content
 */
const recallContent = async (req: Request, args: unknown): Promise<HomeworkDocumentEx> => {
  const { userId } = auth(req);
  const { id, contentId } = await contentIdSchema.concat(idSchema).validate(args);

  const [homework, content] = await Promise.all([
    Homework.findOneAndUpdate(
      { _id: id, user: userId, contents: contentId, deletedAt: { $exists: false } },
      { updatedAt: new Date() },
      { fields: select(), new: true },
    )
      .populate<Populate>(populate)
      .lean(),
    Content.findOne({
      _id: contentId,
      parents: `/homeworks/${id}`,
      creator: userId,
      flags: { $nin: [CONTENT.FLAG.BLOCKED, CONTENT.FLAG.RECALLED] },
    }).lean(),
  ]);

  const [classroom] = await Promise.all([
    homework && Classroom.findOne({ _id: homework.assignment.classroom, deletedAt: { $exists: false } }).lean(),
    homework &&
      Assignment.updateOne({ _id: homework.assignment, deletedAt: { $exists: false } }, { updatedAt: new Date() }), // touch the assignment to trigger teacher(s) to re-fetch
  ]);
  if (!homework || !content || !classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const contentUpdate: UpdateQuery<ContentDocument> = {
    $addToSet: { flags: CONTENT.FLAG.RECALLED },
    data: `${CONTENT_PREFIX.RECALLED}#${Date.now()}###${userId}`,
  };
  const [transformed] = await Promise.all([
    transform(userId, homework),
    Content.updateOne({ _id: contentId }, contentUpdate),
    DatabaseEvent.log(userId, `/homeworks/${id}`, 'recallContent', { args, data: content.data }),
    notifySync(
      classroom.tenant,
      { userIds: [...classroom.teachers, userId], event: 'ASSIGNMENT-HOMEWORK' },
      {
        bulkWrite: {
          assignments: [
            { updateOne: { filter: { _id: homework.assignment._id }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<AssignmentDocument>,
          homeworks: [
            { updateOne: { filter: { _id: id }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<HomeworkDocument>,
          contents: [
            { updateOne: { filter: { _id: content._id }, update: contentUpdate } },
          ] satisfies BulkWrite<ContentDocument>,
        },
      },
    ),
  ]);

  return transformed;
};

/**
 * Update Homework (from teacher or student)
 * action: addContent, answer, grade (score), shareTo
 */
const update = async (req: Request, args: unknown): Promise<HomeworkDocumentEx> => {
  const { userId } = auth(req);
  const { id, answer, content: data, timeSpent, viewedExample } = await homeworkSchema.concat(idSchema).validate(args);

  if (!answer && !data && !timeSpent && viewedExample === undefined)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const content =
    !!data && new Content<Partial<ContentDocument>>({ parents: [`/homeworks/${id}`], creator: userId, data });

  // note: deep-merge is smart enough to merge two $push
  const push = {
    ...(content && { contents: content._id }),
    ...(viewedExample !== undefined && { viewedExamples: viewedExample }),
  };

  const homeworkUpdate: UpdateQuery<AssignmentDocument> = {
    ...(answer && { answer, answeredAt: new Date() }),
    ...(timeSpent && { timeSpent }),
    ...(Object.keys(push).length && { $push: push }),
  };

  const homework = await Homework.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: { $exists: false } },
    homeworkUpdate,
    { fields: select(), new: true },
  )
    .populate<Populate>(populate)
    .lean();

  const [classroom] = await Promise.all([
    homework && Classroom.findOne({ _id: homework.assignment.classroom, deletedAt: { $exists: false } }).lean(),
    homework &&
      Assignment.updateOne({ _id: homework.assignment, deletedAt: { $exists: false } }, { updatedAt: new Date() }), // touch the assignment to trigger teacher(s) to re-fetch
  ]);
  if (!homework || !content || !classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [transformed] = await Promise.all([
    transform(userId, homework),
    content && content.save(),
    DatabaseEvent.log(userId, `/homeworks/${id}`, 'UPDATE', { answer, timeSpent, viewedExample }),
    notifySync(
      classroom.tenant,
      { userIds: [...classroom.teachers, userId], event: 'ASSIGNMENT-HOMEWORK' },
      {
        bulkWrite: {
          assignments: [
            { updateOne: { filter: { _id: homework.assignment._id }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<AssignmentDocument>,
          homeworks: [
            { updateOne: { filter: { _id: id }, update: homeworkUpdate } },
          ] satisfies BulkWrite<HomeworkDocument>,
        },
        ...(content && { contentsToken: await signContentIds(null, [content._id]) }),
      },
    ),
  ]);

  return transformed;
};

/**
 * Update Assignment (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, ...req.body }) });
      case 'recallContent':
        return res.status(200).json({ data: await recallContent(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  find,
  findMany,
  findOne,
  findOneById,
  recallContent,
  update,
  updateById,
};
