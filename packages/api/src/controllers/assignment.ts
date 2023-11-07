/**
 * Controller: Assignment
 *
 * ! note: assignmentController is ONLY for teacher access
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import type { AssignmentDocument } from '../models/assignment';
import Assignment, { searchableFields } from '../models/assignment';
import type { BookAssignmentDocument } from '../models/book';
import { BookAssignment } from '../models/book';
import type { ClassroomDocument } from '../models/classroom';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import type { ContributionDocument } from '../models/contribution';
import DatabaseEvent from '../models/event/database';
import type { HomeworkDocument } from '../models/homework';
import Homework from '../models/homework';
import type { JobDocument } from '../models/job';
import { queueJob } from '../models/job';
import { mongoId, schoolYear } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';
import { signContentIds } from './content';

type Action = 'grade';

type Populate = {
  bookAssignments: (Omit<BookAssignmentDocument, 'contribution'> & { contribution: ContributionDocument })[];
  homeworks: HomeworkDocument[];
};
type PopulatedAssignment = Omit<AssignmentDocument, 'bookAssignments' | 'homeworks'> & Populate;
type AssignmentDocumentEx = PopulatedAssignment & { contentsToken: string };

const { MSG_ENUM } = LOCALE;
const { ASSIGNMENT } = LOCALE.DB_ENUM;

const { assertUnreachable, auth, paginateSort, searchFilter, select } = common;
const { assignmentGradeSchema, assignmentSchema, assignmentUpdateSchema, idSchema, querySchema, removeSchema } =
  yupSchema;

// nested populate
const populate = [
  { path: 'bookAssignments', select: select(), populate: [{ path: 'contribution', select: select() }] },
  { path: 'homeworks', select: select() },
];

/**
 * (helper) generate contentsToken (contentIds of bookAssignments & homeworks)
 */
const transform = async (userId: Types.ObjectId, assignment: PopulatedAssignment): Promise<AssignmentDocumentEx> => ({
  ...assignment,
  contentsToken: await signContentIds(
    userId,
    [
      ...assignment.bookAssignments.map(a => [a.content, ...a.examples]),
      ...assignment.homeworks.map(h => h.contents),
    ].flat(),
  ),
});

/**
 * Create New Assignment
 *  also create homework documents
 */
const create = async (req: Request, args: unknown): Promise<AssignmentDocumentEx> => {
  const { userId } = auth(req);
  const { assignments, flags, maxScores, homeworks, ...inputFields } = await assignmentSchema.validate(args);

  const bookAssignmentIds = assignments.filter(assignment => mongoose.isObjectIdOrHexString(assignment));
  const manualAssignments = assignments.filter(assignment => !mongoose.isObjectIdOrHexString(assignment));

  const [bookAssignments, classroom] = await Promise.all([
    BookAssignment.find({ _id: { $in: bookAssignmentIds }, deletedAt: { $exists: false } })
      .populate<{ contribution: ContributionDocument }>({ path: 'contribution', select: select() })
      .lean(),
    Classroom.findOne({ _id: inputFields.classroom, teachers: userId, deletedAt: { $exists: false } }).lean(),
  ]);

  if (
    !classroom ||
    bookAssignmentIds.length !== bookAssignments.length ||
    (maxScores && maxScores.length !== assignments.length)
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const _id = mongoId();
  const createdHomeworks = homeworks
    .filter(h => classroom.students.some(s => s.equals(h.user))) // remove homework.users not in classroom.users
    .map(h => new Homework<Partial<HomeworkDocument>>({ assignment: _id, ...h, user: mongoId(h.user) }));

  const assignment = new Assignment<Partial<PopulatedAssignment>>({
    _id,
    ...inputFields,
    classroom: classroom._id,
    maxScores: maxScores?.filter((s): s is number => !!s), // make typescript to filter undefined[]
    flags: flags.filter(f => !!f && Object.keys(ASSIGNMENT.FLAG).includes(f)).filter((flag): flag is string => !!flag), // make typescript to filter undefined[],
    bookAssignments, // populating bookAssignments[]
    manualAssignments,
    homeworks: createdHomeworks, // populating homeworks
  });

  // for assignment auto-grading, queue task
  const job =
    flags.includes(ASSIGNMENT.FLAG.AUTO_GRADE) &&
    (await queueJob({
      type: 'grade',
      owners: classroom.teachers,
      tenantId: classroom.tenant,
      assignmentId: _id,
      startAfter: inputFields.deadline,
    }));
  if (job) assignment.job = job._id;

  const classroomUpdate: UpdateQuery<ClassroomDocument> = { $addToSet: { assignments: _id } };
  const [transformed] = await Promise.all([
    transform(userId, assignment.toObject()), // manually populate homeworks
    Assignment.insertMany(assignment, { includeResultMetadata: true }),
    Classroom.updateOne(classroom, classroomUpdate),
    Homework.insertMany(createdHomeworks, { includeResultMetadata: true }),
    DatabaseEvent.log(userId, `/assignments/${_id}`, 'CREATE', args),
    notifySync(
      classroom.tenant,
      { userIds: [...classroom.teachers, ...classroom.students], event: 'ASSIGNMENT-HOMEWORK' },
      {
        bulkWrite: {
          assignments: [{ insertOne: { document: assignment } }] satisfies BulkWrite<AssignmentDocument>,

          classrooms: [
            { updateOne: { filter: { _id: classroom._id }, update: classroomUpdate } },
          ] satisfies BulkWrite<ClassroomDocument>,

          homeworks: [
            { insertMany: { documents: createdHomeworks.map(h => h.toObject()) } },
          ] satisfies BulkWrite<HomeworkDocument>,

          ...(job && { jobs: [{ insertOne: { document: job } }] satisfies BulkWrite<JobDocument> }),
        },
      },
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
const findCommon = async (userId: Types.ObjectId, args: unknown, getOne = false) => {
  const { id, query } = getOne
    ? await idSchema.concat(querySchema).validate(args)
    : { ...(await querySchema.validate(args)), id: null };

  const years = [schoolYear(-2), schoolYear(-1), schoolYear(0), schoolYear(1)];
  const classrooms = await Classroom.find(
    { teachers: userId, year: { $in: years }, deletedAt: { $exists: false } },
    'assignments',
  ).lean();
  const assignmentIds = classrooms.map(classroom => classroom.assignments).flat();

  if (id)
    return assignmentIds.some(a => a.equals(id)) ? searchFilter<AssignmentDocument>([], { query }, { _id: id }) : null;

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
  const assignments = filter ? await Assignment.find(filter, select()).populate<Populate>(populate).lean() : [];

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
      Assignment.find(filter, select(), options).populate<Populate>(populate).lean(),
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

  const assignment = filter && (await Assignment.findOne(filter, select()).populate<Populate>(populate).lean());

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

  // must update homework before populating in Assignment.findOneAndUpdate()
  const homeworkUpdate: UpdateQuery<HomeworkDocument> = {
    $push: { ...(content && { contents: content._id }), ...(score && { scores: score }) },
  };
  const homework = await Homework.findOneAndUpdate({ _id: homeworkId, assignment: id }, homeworkUpdate).lean();
  if (!homework) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [assignment] = await Promise.all([
    Assignment.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: select(), new: true })
      .populate<Populate>(populate)
      .lean(),
    content && content.save(),
    DatabaseEvent.log(userId, `/assignments/${id}`, 'grade', { id, homeworkId, score }),

    notifySync(
      classroom.tenant,
      { userIds: [...classroom.teachers, homework.user], event: 'ASSIGNMENT-HOMEWORK' },
      {
        bulkWrite: {
          assignments: [
            { updateOne: { filter: { _id: id }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<AssignmentDocument>,
          homeworks: [
            { updateOne: { filter: { _id: homeworkId }, update: homeworkUpdate } },
          ] satisfies BulkWrite<HomeworkDocument>,
        },
        ...(content && { contentsToken: await signContentIds(null, [content._id]) }),
      },
    ),
  ]);

  if (assignment) return transform(userId, assignment);
  log('error', 'assignmentController:grade()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Delete by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userTenants } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  const classroom = await Classroom.findOne({
    tenant: { $in: { userTenants } },
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
    Homework.updateMany({ _id: { $in: assignment.homeworks } }, { updatedAt: new Date() }), // for student re-fetching homework updates
    DatabaseEvent.log(userId, `/assignments/${id}`, 'DELETE', { args }),
    notifySync(
      classroom.tenant,
      { userIds: [...classroom.teachers, ...classroom.students], event: 'ASSIGNMENT-HOMEWORK' },
      {
        bulkWrite: {
          assignments: [
            { updateOne: { filter: { _id: id }, update: { deletedAt: new Date() } } },
          ] satisfies BulkWrite<AssignmentDocument>,
          homeworks: [
            { updateMany: { filter: { _id: { $in: assignment.homeworks } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<HomeworkDocument>,
        },
      },
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
  const { id, ...updateFields } = await assignmentUpdateSchema.concat(idSchema).validate(args);

  const [original, classroom] = await Promise.all([
    Assignment.findOne({ _id: id, deletedAt: { $exists: false } }).lean(),
    Classroom.findOne({
      teachers: userId,
      assignments: id,
      deletedAt: { $exists: false },
    }).lean(),
  ]);
  if (!original || !classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [assignment] = await Promise.all([
    Assignment.findByIdAndUpdate(id, updateFields, { fields: select(), new: true }).populate<Populate>(populate).lean(),
    Homework.updateMany({ _id: { $in: original.homeworks } }, { updatedAt: new Date() }), // for student re-fetching homework updates
    DatabaseEvent.log(userId, `/assignments/${id}`, 'UPDATE', { args }),
    notifySync(
      classroom.tenant,
      { userIds: [...classroom.teachers, ...classroom.students], event: 'ASSIGNMENT-HOMEWORK' },
      {
        bulkWrite: {
          assignments: [
            { updateOne: { filter: { _id: id }, update: updateFields } },
          ] satisfies BulkWrite<AssignmentDocument>,
          homeworks: [
            {
              updateMany: {
                filter: { _id: { $in: original.homeworks.map(h => h._id) } },
                update: { updatedAt: new Date() },
              },
            },
          ] satisfies BulkWrite<HomeworkDocument>,
        },
      },
    ),
  ]);
  if (assignment) return transform(userId, assignment);
  log('error', 'assignmentController:update()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
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
