/**
 * Controller: Assignment
 *
 * ! note: assignmentController is ONLY for teacher access
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import type { AssignmentDocument, Id } from '../models/assignment';
import Assignment, { searchableFields } from '../models/assignment';
import type { BookAssignmentDocument } from '../models/book';
import { BookAssignment } from '../models/book';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import DatabaseEvent from '../models/event/database';
import type { HomeworkDocument } from '../models/homework';
import Homework from '../models/homework';
import Job from '../models/job';
import { idsToString, schoolYear } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';
import { signContentIds } from './content';

type Action = 'grade';

type AssignmentDocumentEx = AssignmentDocument & Id & { contentsToken: string };

const { MSG_ENUM } = LOCALE;
const { ASSIGNMENT } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, paginateSort, searchFilter, select } = common;
const { assignmentGradeSchema, assignmentSchema, assignmentUpdateSchema, idSchema, querySchema, removeSchema } =
  yupSchema;

// nested populate
const nestedPopulate = [
  { path: 'bookAssignments', select: select(), populate: [{ path: 'contribution', select: select() }] },
  { path: 'homeworks', select: select() },
];

/**
 * (helper) generate contentsToken (contentIds of bookAssignments & homeworks)
 */
const transform = async (userId: string, assignment: AssignmentDocument & Id): Promise<AssignmentDocumentEx> => {
  return {
    ...assignment,
    contentsToken: await signContentIds(
      userId,
      idsToString(
        [
          ...(assignment.bookAssignments as (BookAssignmentDocument & Id)[]).map(a => [a.content, ...a.examples]),
          ...(assignment.homeworks as (HomeworkDocument & Id)[]).map(h => h.contents),
        ].flat(),
      ),
    ),
  };
};

/**
 * Create New Assignment
 *  also create homework documents
 */
const create = async (req: Request, args: unknown): Promise<AssignmentDocumentEx> => {
  const { userId } = auth(req);
  const { questions, flags, maxScores, homeworks, ...fields } = await assignmentSchema.validate(args);

  const bookAssignments = questions.filter(question => mongoose.isObjectIdOrHexString(question));
  const manualAssignments = questions.filter(question => !mongoose.isObjectIdOrHexString(question));

  const [bookAssignmentCount, classroom] = await Promise.all([
    bookAssignments.length &&
      BookAssignment.countDocuments({ _id: { $in: bookAssignments }, deletedAt: { $exists: false } }),
    Classroom.findOne({ _id: fields.classroom, teachers: userId, deletedAt: { $exists: false } }).lean(),
  ]);

  if (
    !classroom ||
    bookAssignments.length !== bookAssignmentCount ||
    (maxScores && maxScores.length !== questions.length) ||
    homeworks.map(h => h.user).filter(user => !idsToString(classroom.students).includes(user)).length // homework.users MUST match classroom.users
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const assignment = new Assignment<Partial<AssignmentDocument>>({
    ...fields,
    maxScores: maxScores?.filter((s): s is number => !!s), // make typescript to filter undefined[]
    flags: flags.filter(f => !!f && Object.keys(ASSIGNMENT.FLAG).includes(f)).filter((flag): flag is string => !!flag), // make typescript to filter undefined[],
    bookAssignments,
    manualAssignments,
  });

  const createdHomeworks = homeworks.map(
    homework => new Homework<Partial<HomeworkDocument & Id>>({ assignment, ...homework }),
  );
  assignment.homeworks = createdHomeworks;
  const id = assignment._id.toString();

  // for auto-grade assignment, queue task
  if (flags.includes(ASSIGNMENT.FLAG.AUTO_GRADE))
    assignment.job = await Job.queue({ task: 'grade', args: { assignmentId: id }, startAfter: fields.deadline });

  const [transformed] = await Promise.all([
    transform(userId, assignment),
    assignment.save(),
    Homework.create(createdHomeworks),
    Classroom.updateOne({ _id: classroom }, { $addToSet: { assignments: id } }),
    DatabaseEvent.log(userId, `/assignments/${id}`, 'CREATE', { assignment: fields }),
    notifySync('ASSIGNMENT', { tenantId: classroom.tenant, userIds: classroom.teachers }, { assignmentIds: [id] }),
    notifySync(
      'HOMEWORK',
      { tenantId: classroom.tenant, userIds: classroom.students },
      { homeworkIds: createdHomeworks },
    ),
  ]);

  return transformed;
};

/**
 * Create New Assignment
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

  const classrooms = await Classroom.find(
    { teachers: userId, year: { $in: [schoolYear(-1), schoolYear(0), schoolYear(1)] }, deletedAt: { $exists: false } },
    'assignments',
  ).lean();
  const assignmentIds = classrooms.map(classroom => classroom.assignments).flat();

  if (id)
    return idsToString(assignmentIds).includes(id)
      ? searchFilter<AssignmentDocument>([], { query }, { _id: id })
      : null;

  return assignmentIds.length
    ? searchFilter<AssignmentDocument>(searchableFields, { query }, { _id: { $in: assignmentIds } })
    : null;
};

/**
 * Find Multiple Assignments (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<AssignmentDocumentEx[]> => {
  const { userId } = auth(req);
  const filter = await findCommon(userId, args);
  const assignments = filter ? await Assignment.find(filter, select()).populate(nestedPopulate).lean() : [];

  return Promise.all(assignments.map(async assignment => transform(userId, assignment)));
};

/**
 * Find Multiple Assignments with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = auth(req);
    const filter = await findCommon(userId, { query: req.query });
    const options = paginateSort(req.query, { updatedAt: -1 });

    if (!filter) return res.status(200).json({ meta: { total: 0, ...options }, data: [] });

    const [total, assignments] = await Promise.all([
      Assignment.countDocuments(filter),
      Assignment.find(filter, select(), options).populate(nestedPopulate).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: await Promise.all(assignments.map(async assignment => transform(userId, assignment))),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Assignment by ID
 */
const findOne = async (req: Request, args: unknown): Promise<AssignmentDocumentEx | null> => {
  const { userId } = auth(req);
  const filter = await findCommon(userId, args, true);

  const assignment = filter && (await Assignment.findOne(filter, select()).populate(nestedPopulate).lean());
  return assignment && transform(userId, assignment);
};

/**
 * Find One Assignment by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const assignment = await findOne(req, { id: req.params.id });
    assignment ? res.status(200).json({ data: assignment }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Grade homework
 */
const grade = async (req: Request, args: unknown): Promise<AssignmentDocumentEx> => {
  const { userId } = auth(req);
  const { id, homeworkId, content: data, score } = await assignmentGradeSchema.concat(idSchema).validate(args);

  const [original, classroom] = await Promise.all([
    Assignment.exists({ _id: id, deletedAt: { $exists: false } }),
    Classroom.findOne({
      teachers: userId,
      assignments: id,
      deletedAt: { $exists: false },
    }).lean(),
  ]);
  if (!original || !classroom || (!data && !score)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const content =
    !!data && new Content<Partial<ContentDocument>>({ parents: [`/homeworks/${homeworkId}`], creator: userId, data });
  const homework = await Homework.findOneAndUpdate(
    { _id: homeworkId, assignment: id },
    { $push: { ...(content && { contents: content }), ...(score && { scores: score }) } },
  ).lean();
  if (!homework) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [assignment] = await Promise.all([
    Assignment.findByIdAndUpdate(
      id,
      { updatedAt: new Date() },
      { fields: select(), new: true, populate: nestedPopulate },
    ).lean(),
    content && content.save(),
    DatabaseEvent.log(userId, `/assignments/${id}`, 'grade', { homeworkId, score }),
    notifySync('ASSIGNMENT', { tenantId: classroom.tenant, userIds: classroom.teachers }, { assignmentIds: [id] }),
    notifySync('HOMEWORK', { tenantId: classroom.tenant, userIds: [homework.user] }, { homeworkIds: [homeworkId] }),
  ]);

  if (assignment) return transform(userId, assignment);
  log('error', 'questionController:grade()', { id, homeworkId, score }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Delete by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  const classroom = await Classroom.findOne({
    teachers: userId,
    assignments: id,
    deletedAt: { $exists: false },
  }).lean();
  if (!classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const assignment = await Assignment.findOneAndUpdate(
    { _id: id, classroom, deletedAt: { $exists: false } },
    { deletedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
  ).lean();
  if (!assignment) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    DatabaseEvent.log(userId, `/assignments/${id}`, 'DELETE', { remark }),
    notifySync('ASSIGNMENT', { tenantId: classroom.tenant, userIds: classroom.teachers }, { assignmentIds: [id] }),
    notifySync(
      'HOMEWORK',
      { tenantId: classroom.tenant, userIds: classroom.students },
      { homeworkIds: assignment.homeworks },
    ),
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
 * Update
 */
const update = async (req: Request, args: unknown): Promise<AssignmentDocumentEx> => {
  const { userId } = auth(req);
  const { id, ...fields } = await assignmentUpdateSchema.concat(idSchema).validate(args);

  const classroom = await Classroom.findOne({
    teachers: userId,
    assignments: id,
    deletedAt: { $exists: false },
  }).lean();
  if (!classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const assignment = await Assignment.findByIdAndUpdate(id, fields, {
    fields: select(),
    new: true,
    populate: nestedPopulate,
  }).lean();
  if (!assignment) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [transformed] = await Promise.all([
    transform(userId, assignment),
    DatabaseEvent.log(userId, `/assignments/${id}`, 'UPDATE', fields),
    notifySync('ASSIGNMENT', { tenantId: classroom.tenant, userIds: classroom.teachers }, { assignmentIds: [id] }),
    notifySync(
      'HOMEWORK',
      { tenantId: classroom.tenant, userIds: classroom.students },
      { homeworkIds: assignment.homeworks },
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
      case 'grade':
        return res.status(200).json({ data: await grade(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  grade,
  remove,
  removeById,
  update,
  updateById,
};
