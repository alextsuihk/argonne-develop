/**
 * Controller: Assignment
 *
 *
 */

import type { DocumentSync } from '@argonne/common';
import { LOCALE, yupSchema } from '@argonne/common';
import { addHours } from 'date-fns';
import merge from 'deepmerge';
import type { Request, RequestHandler } from 'express';
import type { FilterQuery, LeanDocument, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import type { AssignmentDocument, HomeworkDocument } from '../models/assignment';
import Assignment, { Homework, searchableFields } from '../models/assignment';
import { BookAssignment, BookAssignmentDocument } from '../models/book';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import ChatGroup from '../models/chat-group';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import DatabaseEvent from '../models/event/database';
import Job from '../models/job';
import type { ChatResponse } from '../utils/chat';
import { idsToString } from '../utils/helper';
import { notify } from '../utils/messaging';
import syncSatellite from '../utils/sync-satellite';
import { checkOwnership } from './chat';
import type { StatusResponse } from './common';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { ASSIGNMENT } = LOCALE.DB_ENUM;
const { auth, isTeacher, paginateSort, searchFilter, select } = common;
const { assignmentSchema, assignmentUpdateSchema, idSchema, querySchema, removeSchema } = yupSchema;

/**
 * (helper) Read Back with populate
 */
const findAndPopulate = async (
  req: Request,
  filter: FilterQuery<AssignmentDocument>,
  options?: ReturnType<typeof paginateSort>,
) => {
  const { userId, userExtra } = auth(req);

  // populate as teacher
  if (await isTeacher(userExtra))
    return Assignment.find(filter, select(), options)
      .populate([
        {
          path: 'bookAssignments',
          select: select(),
          populate: [
            { path: 'contribution', select: select(), populate: { path: 'contributors', select: select() } },
            { path: 'content', select: select() },
            { path: 'examples', select: select() },
          ],
        },
        { path: 'homeworks', select: select(), populate: { path: 'contents', select: select() } },
      ])
      .lean();

  // populate as student
  // TODO: remove old complicated (not tested) approach
  // const [assignmentsBeforeDeadline, assignmentsAfterDeadline] = await Promise.all([
  //   Assignment.find({ ...filter, deadline: { $gte: Date.now() }, deletedAt: { $exists: false } }, select(), options)
  //     .populate([
  //       {
  //         path: 'bookAssignments',
  //         select: `${select()} -urls -solutions`,
  //         populate: [
  //           { path: 'contribution', select: select(), populate: { path: 'contributors', select: select() } },
  //           { path: 'content', select: select() },
  //           { path: 'examples', select: select() },
  //         ],
  //       },
  //       {
  //         path: 'homeworks',
  //         select: select(),
  //         match: { user: userId },
  //         populate: { path: 'contents', select: select() },
  //       },
  //     ])
  //     .lean(),
  //   Assignment.find({ ...filter, deadline: { $lt: Date.now() }, deletedAt: { $exists: false } }, select(), options)
  //     .populate([
  //       {
  //         path: 'bookAssignments',
  //         select: select(),
  //         populate: [
  //           { path: 'contributors', select: select() },
  //           { path: 'content', select: select() },
  //           { path: 'examples', select: select() },
  //         ],
  //       },
  //       {
  //         path: 'homeworks',
  //         select: select(),
  //         match: { user: userId },
  //         populate: { path: 'contents', select: select() },
  //       },
  //     ])
  //     .lean(),
  // ]);

  // return [...assignmentsBeforeDeadline, ...assignmentsAfterDeadline].sort(
  //   (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  // );

  const assignments = await Assignment.find({ ...filter, deletedAt: { $exists: false } }, select(), options)
    .populate([
      {
        path: 'bookAssignments',
        select: select(),
        populate: [
          { path: 'contribution', select: select(), populate: { path: 'contributors', select: select() } },
          { path: 'content', select: select() },
          { path: 'examples', select: select() },
        ],
      },
      {
        path: 'homeworks',
        select: select(),
        match: { user: userId },
        populate: { path: 'contents', select: select() },
      },
    ])
    .lean();

  return assignments.map(assignment => ({
    ...assignment,
    bookAssignments: (assignment.bookAssignments as BookAssignmentDocument[]).map(bookAssignment => ({
      ...bookAssignment,
      ...(assignment.deadline > new Date() && { solutions: [] }), // hide solutions if before deadline
    })),
  }));
};

/**
 * Create New Assignment
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<AssignmentDocument>> => {
  const { userId } = auth(req);
  const {
    assignment: { questions, flags, maxScores, homeworks, ...fields },
  } = await assignmentSchema.validate(args);

  const bookAssignments = questions.filter(question => mongoose.isObjectIdOrHexString(question));
  const manualAssignments = questions.filter(question => !mongoose.isObjectIdOrHexString(question));

  const [bookCount, classroom] = await Promise.all([
    bookAssignments.length &&
      BookAssignment.countDocuments({ _id: { $in: bookAssignments }, deletedAt: { $exists: false } }),
    Classroom.findOne({ _id: fields.classroom, deletedAt: { $exists: false } }).lean(),
  ]);

  if (!classroom || bookAssignments.length !== bookCount) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (!idsToString(classroom.teachers).includes(userId))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const intersectedFlags = flags
    .filter(f => !!f && Object.keys(ASSIGNMENT.FLAG).includes(f))
    .filter((flag: string | undefined): flag is string => !!flag); // make typescript to filter undefined[]
  const createdHomeworks = homeworks.map(homework => new Homework<Partial<HomeworkDocument>>(homework));
  const assignment = new Assignment<Partial<AssignmentDocument>>({
    ...fields,
    maxScores: maxScores?.filter((s: number | undefined): s is number => !!s), // make typescript to filter undefined[]
    flags: intersectedFlags,
    bookAssignments: idsToString(bookAssignments),
    manualAssignments: idsToString(manualAssignments),
    homeworks: idsToString(createdHomeworks),
  });
  const id = assignment._id.toString();

  // for auto-grade assignment, queue task
  if (flags.includes(ASSIGNMENT.FLAG.AUTO_GRADE))
    assignment.job = await Job.queue({ task: 'grade', args: { assignment: id }, startAfter: addHours(Date.now(), 1) });

  const ids: DocumentSync = { assignmentIds: [id], homeworkIds: idsToString(createdHomeworks) };
  const [createdAssignment] = await Promise.all([
    assignment.save(),
    ...createdHomeworks.map(homework => homework.save()),
    DatabaseEvent.log(userId, `/assignments/${id}`, 'CREATE', { assignment: fields }),
    notify(classroom.teachers, 'ASSIGNMENT', ids),
    syncSatellite({ tenantId: classroom.tenant, userIds: classroom.teachers }, ids),
  ]);

  const assignments = await findAndPopulate(req, { _id: createdAssignment });
  return assignments[0]!;
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

/**
 * Find Multiple Assignments (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<AssignmentDocument>[]> => {
  const { userId } = auth(req);
  const { query } = await querySchema.validate(args);

  const classroom = await Classroom.findOne(
    { $or: [{ teachers: userId }, { students: userId }], deletedAt: { $exists: false } },
    select(),
  ).lean();
  if (!classroom) return [];

  const filter = searchFilter<AssignmentDocument>(searchableFields, { query }, { _id: { $in: classroom.assignments } });
  return findAndPopulate(req, filter);
};

/**
 * Find Multiple Assignments with queryString (RESTful)
 * ! classroomId would & should be provided /?search=classroomId
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = auth(req);
    const { query } = await querySchema.validate({ query: req.query });

    const classroom = await Classroom.findOne(
      { $or: [{ teachers: userId }, { students: userId }], deletedAt: { $exists: false } },
      select(),
    ).lean();

    const filter = classroom
      ? searchFilter<AssignmentDocument>(searchableFields, { query }, { _id: { $in: classroom.assignments } })
      : {};
    const options = paginateSort(req.query, { updatedAt: -1 });

    const [total, assignments] = classroom
      ? [0, []]
      : await Promise.all([Assignment.countDocuments(filter), findAndPopulate(req, filter, options)]);

    res.status(200).json({ meta: { total, ...options, sort: { updatedAt: -1 } }, data: assignments });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Assignment by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<AssignmentDocument> | null> => {
  const { userId } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const classroom = await Classroom.findOne(
    { $or: [{ teachers: userId }, { students: userId }], assignments: id, deletedAt: { $exists: false } },
    select(),
  ).lean();
  if (!classroom) null;

  const filter = searchFilter<AssignmentDocument>([], { query }, { _id: id });
  const assignments = await findAndPopulate(req, filter);
  return assignments[0]!;
};

/**
 * Find One Assignment by ID (RESTful)
 * ! classroomId would & should be provided /?search=classroomId
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  const { query } = await querySchema.validate({ query: req.query });

  try {
    const data = await findOne(req, { classroomId: query.search, id: req.params.id });
    data ? res.status(200).json({ data }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  const classroom = await Classroom.findOne(
    { teachers: userId, assignments: id, deletedAt: { $exists: false } },
    select(),
  ).lean();

  if (!classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const assignment = await Assignment.findOneAndUpdate(
    { _id: id, classroom, deletedAt: { $exists: false } },
    { deletedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
  ).lean();
  if (!assignment) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = [userId, ...idsToString(classroom.teachers), ...idsToString(classroom.students)];
  await Promise.all([
    DatabaseEvent.log(userId, `/assignments/${id}`, 'DELETE', { remark }),
    notify(userIds, 'ASSIGNMENT', { assignmentIds: [id] }), // only mark assignment as deleted, do not touch details
    syncSatellite({ tenantId: classroom.tenant, userIds }, { assignmentIds: [id] }),
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
 * Update Homework (from teacher or student)
 * action: addContent, answer, grade (score), shareTo
 */
const update = async (req: Request, args: unknown): Promise<LeanDocument<AssignmentDocument>> => {
  const { userId } = auth(req);
  const fields = await assignmentUpdateSchema.validate(args);
  const { id, homeworkId, deadline, content: data, answer, score, timeSpent, viewExample, shareTo } = fields;

  const [classroom, assignment, homework] = await Promise.all([
    Classroom.findOneAndUpdate(
      { $or: [{ teachers: userId }, { students: userId }], assignments: id, deletedAt: { $exists: false } },
      { updatedAt: new Date() },
    ).lean(),
    Assignment.findOne({ _id: id, homeworks: homeworkId, deletedAt: { $exist: false } }).lean(),
    Homework.findById(homeworkId).lean(),
  ]);

  const isTeacher = classroom && idsToString(classroom.teachers).includes(userId);

  if (
    !classroom ||
    !assignment ||
    !homework ||
    !(data || isTeacher ? deadline || score || shareTo : viewExample !== undefined || answer) // viewExample could be 0 (index 0)
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // share to classroomId or another chatGroupId
  if (isTeacher && shareTo) {
    const { model, id: shareToId, parentDoc } = await checkOwnership(userId, shareTo, 'ADMIN_TEACHER');

    const chat = new Chat<Partial<ChatDocument>>({
      parents: [`/${model}/${shareToId}`],
      title: 'Sharing student homework',
      members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
      contents: homework.contents,
    });

    if (model === 'chatGroups') {
      // share assignment's homework to a chatGroup
      const ids: ChatResponse = {
        chatGroupIds: [id],
        chatIds: [chat._id.toString()],
        contentIds: idsToString(homework.contents),
      };
      const userIds = [userId, ...idsToString(parentDoc.users)];
      await Promise.all([
        chat.save(),
        Content.updateMany({ _id: { $in: homework.contents } }, { $push: { parents: `/chats/${chat._id}` } }),
        ChatGroup.findByIdAndUpdate(shareToId, { $push: { chats: chat } }).lean(),
        DatabaseEvent.log(userId, `/chatGroups/${shareToId}`, 'SHARE', {
          event: `sharing homework (${homeworkId}) of assignment (${id}) to chatGroup (${shareToId})`,
        }),
        notify(userIds, 'CHAT-GROUP', ids),
        syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids),
      ]);
    } else {
      // share assignment's homework to a classroom
      const ids: ChatResponse = {
        classroomIds: [id],
        chatIds: [chat._id.toString()],
        contentIds: idsToString(homework.contents),
      };
      const userIds = [userId, ...idsToString(parentDoc.teachers), ...idsToString(parentDoc.students)];
      await Promise.all([
        chat.save(),
        Content.updateMany({ _id: { $in: homework.contents } }, { $push: { parents: `/chats/${chat._id}` } }),
        Classroom.findById(shareToId, { $push: { chats: chat } }).lean(),
        DatabaseEvent.log(userId, `/classrooms/${shareToId}`, 'SHARE', {
          event: `sharing homework (${homeworkId}) of assignment (${id}) to classroom (${shareToId})`,
        }),
        notify(userIds, 'CLASSROOM', ids),
        syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids),
      ]);
    }
  }

  // submit homework, grade homework, viewExample
  const content = data
    ? new Content<Partial<ContentDocument>>({ parents: [`/assignments/${id}/${homeworkId}`], creator: userId, data })
    : null;

  // note: deep-merge is smart enough to merge two $push
  const homeworkUpdate = merge.all<UpdateQuery<AssignmentDocument>>([
    content ? { $push: { contents: content } } : {},
    !isTeacher && answer ? { answer, answeredAt: new Date() } : {},
    isTeacher && deadline ? { deadline } : {},
    isTeacher && score ? { score } : {},
    !isTeacher && timeSpent ? { timeSpent } : {},
    !isTeacher && viewExample !== undefined && !homework.viewedExamples?.includes(viewExample)
      ? { $push: { viewedExamples: viewExample } }
      : {},
  ]);

  const ids: DocumentSync = {
    assignmentIds: [id],
    homeworkIds: [homeworkId],
    contentIds: idsToString(homework.contents),
  };
  const userIds = [...classroom.teachers, homework.user]; // only notify teachers and one (homework) student

  await Promise.all([
    Homework.findByIdAndUpdate(homeworkId, homeworkUpdate).lean(),
    content?.save(),
    DatabaseEvent.log(userId, `/assignments/${id}`, 'UPDATE', { assignment: fields }),
    notify(userIds, 'ASSIGNMENT', ids),
    syncSatellite({ tenantId: classroom.tenant, userIds: userIds }, ids),
  ]);

  // read-back assignment
  const assignments = await findAndPopulate(req, { _id: id });
  return assignments[0]!;
};

/**
 * Update Assignment (RESTful)
 */
const updateById: RequestHandler<{ id: string }> = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    return res.status(200).json({ data: await update(req, { id, ...req.body }) });
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
  remove,
  removeById,
  update,
  updateById,
};
