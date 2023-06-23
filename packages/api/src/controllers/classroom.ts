/**
 * Controller: Classroom
 *
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

import Assignment from '../models/assignment';
import Book, { BookAssignment } from '../models/book';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import ChatGroup from '../models/chat-group';
import type { ClassroomDocument, Id } from '../models/classroom';
import Classroom, { searchableFields } from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import DatabaseEvent from '../models/event/database';
import Homework from '../models/homework';
import Level from '../models/level';
import Question from '../models/question';
import Subject from '../models/subject';
import type { TenantDocument } from '../models/tenant';
import Tenant from '../models/tenant';
import User from '../models/user';
import { idsToString, schoolYear, uniqueIds } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';
import { signContentIds } from './content';

type Action =
  | 'addContent'
  | 'addContentWithNewChat'
  | 'addRemark'
  | 'attachChatGroup'
  | 'attachClassroom'
  | 'blockContent'
  | 'clearChatFlag'
  | 'recallContent'
  | 'recover'
  | 'setChatFlag'
  | 'shareHomework'
  | 'shareQuestion'
  | 'updateChatTitle'
  | 'updateChatLastViewedAt'
  | 'updateStudents'
  | 'updateTeachers';

type ClassroomDocumentEx = ClassroomDocument & Id & { contentsToken: string };

const { MSG_ENUM } = LOCALE;
const { CHAT, CONTENT, TENANT, USER } = LOCALE.DB_ENUM;

const { assertUnreachable, auth, paginateSort, searchFilter, select } = common;
const {
  chatIdSchema,
  classroomCoreSchema,
  classroomExtraSchema,
  contentIdSchema,
  contentSchema,
  flagSchema,
  idSchema,
  optionalTimestampSchema,
  optionalTitleSchema,
  querySchema,
  remarkSchema,
  removeSchema,
  sourceIdSchema,
  userIdsSchema,
} = yupSchema;

const adminSelect = select([USER.ROLE.ADMIN]);
const populate = [{ path: 'chats', select: select() }];
/**
 * (helper) only classroom.teachers, tenant.admins have permission to proceed (within same schoolYear or next schoolYear)
 */
const checkPermission = async (
  id: string,
  userId: string,
  userTenants: string[],
  opts?: { skipDeleteCheck?: boolean },
) => {
  const classroom = await Classroom.findOne({
    _id: id,
    tenant: { $in: userTenants },
    year: { $in: [schoolYear(), schoolYear(1)] },
    ...(!opts?.skipDeleteCheck && { deletedAt: { $exists: false } }),
  }).lean();
  if (!classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  if (idsToString(classroom.teachers).includes(userId) || (await Tenant.findByTenantId(classroom.tenant, userId)))
    return classroom;

  throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
};

/**
 * (helper) get parentId from chat.parents
 */
const otherParentIds = (chat: ChatDocument & Id, classroomId: string | Types.ObjectId) => {
  const chatGroupIds = chat.parents.filter(p => p.startsWith('/chatGroups')).map(p => p.replace('/chatGroups/', ''));
  const classroomIds = chat.parents.filter(p => p.startsWith('/classrooms')).map(p => p.replace('/classrooms/', ''));
  const otherClassroomIds = classroomIds.filter(id => id !== classroomId.toString());

  return { chatGroupIds, classroomIds, otherClassroomIds };
};

/**
 * (helper) generate contentsToken
 */
const transform = async (
  userId: string,
  classroom: ClassroomDocument & Id,
  tenants: (TenantDocument & Id)[],
): Promise<ClassroomDocumentEx> => ({
  ...classroom,
  remarks:
    idsToString(classroom.teachers).includes(userId) ||
    idsToString(tenants.find(t => t._id.toString() === classroom.tenant.toString())?.admins || []).includes(userId)
      ? classroom.remarks
      : [],
  contentsToken: await signContentIds(
    userId,
    classroom.chats
      .map(chat =>
        typeof chat === 'string' || chat instanceof mongoose.Types.ObjectId ? 'ERROR' : idsToString(chat.contents),
      )
      .flat(),
  ),
});

/**
 * addContent
 */
const addContent = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const {
    id,
    chatId,
    content: data,
    visibleAfter,
  } = await chatIdSchema.concat(contentSchema).concat(idSchema).validate(args);

  const [original, chat] = await Promise.all([
    Classroom.findOne({
      _id: id,
      $or: [{ students: userId }, { teachers: userId }],
      tenant: { $in: userTenants },
      chats: chatId,
      deletedAt: { $exists: false },
    }).lean(),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!original || !chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chatId}`],
    creator: userId,
    data,
    visibleAfter,
  });

  // must update chat before classroom update & populate
  await Chat.updateOne(
    { _id: chat },
    {
      members: chat.members.map(m => (m.user.toString() === userId ? { ...m, lastViewedAt: new Date() } : m)),
      $push: { contents: content },
    },
  );

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true, populate }).lean(),
    Tenant.findByTenantId(original.tenant),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    content.save(),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [...original.teachers, ...original.students] },
      { chatGroupIds, classroomIds, chatIds: [chatId], contentIds: [content] },
    ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:addContent()', { id, chatId }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addContentWithNewChat
 */
const addContentWithNewChat = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const {
    id,
    content: data,
    title,
    visibleAfter,
  } = await contentSchema.concat(idSchema).concat(optionalTitleSchema).validate(args);

  const original = await Classroom.findOne({
    _id: id,
    $or: [{ students: userId }, { teachers: userId }],
    tenant: { $in: userTenants },
    deletedAt: { $exists: false },
  }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const content = new Content<Partial<ContentDocument>>({ creator: userId, data, visibleAfter });

  // must create chat before classroom update & populate
  const chat = await Chat.create<Partial<ChatDocument>>({
    parents: [`/classrooms/${id}`],
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    contents: [content._id],
    ...(title && { title }),
  });
  content.parents = [`/chats/${chat._id}`];

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { $push: { chats: chat } }, { fields: adminSelect, new: true, populate }).lean(),
    Tenant.findByTenantId(original.tenant),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    content.save(),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [...original.teachers, ...original.students] },
      { chatGroupIds, classroomIds, chatIds: [chat], contentIds: [content] },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:addContentWithNewChat()', { id, title }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const original = await checkPermission(id, userId, userTenants);

  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(
      id,
      { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
      { fields: adminSelect, new: true, populate },
    ).lean(),
    Tenant.findByTenantId(original.tenant),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'REMARK', { remark }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [...original.teachers, userId] },
      { classroomIds: [id] },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:addRemark()', { id, remark }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Attach a chat (from chatGroup or another classroom) to this classroom (within the same tenantId)
 */
const attach = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'attachClassroom' | 'attachChatGroup'>,
): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, chatId, sourceId } = await chatIdSchema.concat(idSchema).concat(sourceIdSchema).validate(args);

  const [original, validChat, source] = await Promise.all([
    checkPermission(id, userId, userTenants),
    Chat.exists({
      _id: chatId,
      parents: `/${action === 'attachChatGroup' ? 'chatGroups' : 'classrooms'}/${sourceId}`,
      deletedAt: { $exists: false },
    }),
    action === 'attachChatGroup'
      ? ChatGroup.findOne({
          _id: sourceId,
          admins: userId,
          tenant: { $in: userTenants },
          chats: chatId,
          deletedAt: { $exists: false },
        }).lean()
      : Classroom.findOne({
          _id: sourceId,
          teachers: userId,
          tenant: { $in: userTenants },
          chats: chatId,
          deletedAt: { $exists: false },
        }).lean(),
  ]);
  if (
    !validChat ||
    !source ||
    idsToString(original.chats).includes(chatId) ||
    original.tenant.toString() !== source.tenant?.toString()
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Chat.updateMany({ _id: chatId }, { $addToSet: { parents: `/classrooms/${id}` } }); // must update chats before classroom populating
  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { $push: { chats: chatId } }, { fields: adminSelect, new: true, populate }).lean(),
    Tenant.findByTenantId(original.tenant),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [...original.teachers, ...original.students] },
      { classroomIds: [id], chatIds: [chatId] },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', `classroomController:${action}()`, { id }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Block a classroom chat content
 * (only teacher or tenantAdmins could block content)
 */
const blockContent = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, chatId, contentId, remark } = await chatIdSchema
    .concat(contentIdSchema)
    .concat(removeSchema)
    .validate(args);

  const [original, chat, content] = await Promise.all([
    checkPermission(id, userId, userTenants),
    Chat.findOne({
      _id: chatId,
      parents: `/classrooms/${id}`,
      contents: contentId,
      deletedAt: { $exists: false },
    }).lean(),
    Content.findOne({
      _id: contentId,
      parents: `/chats/${chatId}`,
      flags: { $nin: [CONTENT.FLAG.BLOCKED, CONTENT.FLAG.RECALLED] },
    }).lean(),
  ]);
  if (!idsToString(original.chats).includes(chatId) || !chat || !content)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true, populate }).lean(), // indicating there is an update (in grandchild)
    Tenant.findByTenantId(original.tenant),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    Content.updateOne(
      { _id: contentId },
      { $addToSet: { flags: CONTENT.FLAG.BLOCKED }, data: `${CONTENT_PREFIX.BLOCKED}#${Date.now()}###${userId}` },
    ),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'blockContent', { chatId, contentId, remark, data: content.data }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [userId, ...original.teachers, ...original.students] },
      { chatGroupIds, classroomIds, contentIds: [contentId] },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:blockContent()', { id, chatId, contentId, remark }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Create New Classroom
 */
const create = async (req: Request, args: unknown): Promise<ClassroomDocument & Id> => {
  const { userId, userTenants } = auth(req);
  const { tenantId, ...fields } = await classroomCoreSchema.concat(classroomExtraSchema).validate(args);

  const [bookCount, level, subject, tenant] = await Promise.all([
    Book.countDocuments({ _id: { $in: fields.books }, level: fields.level, subjects: fields.subject }),
    Level.exists({ _id: fields.level, deletedAt: { $exists: false } }),
    Subject.exists({ _id: fields.subject, levels: fields.level, deletedAt: { $exists: false } }),
    Tenant.findByTenantId(tenantId, userId),
  ]);

  if (!userTenants.includes(tenantId) || !tenant.services.includes(TENANT.SERVICE.CLASSROOM))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  if (!level || !subject || fields.books.length !== bookCount)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const classroom = new Classroom<Partial<ClassroomDocument>>({ tenant: tenantId, ...fields });

  const [transformed] = await Promise.all([
    transform(userId, classroom.toObject(), [tenant]),
    classroom.save(),
    DatabaseEvent.log(userId, `/classrooms/${classroom._id}`, 'CREATE', { classroom: fields }),
    notifySync('CLASSROOM', { tenantId, userIds: [userId] }, { classroomIds: [classroom] }),
  ]);

  return transformed;
};

/**
 * Create New Classroom (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, req.body) });
  } catch (error) {
    next(error);
  }
};

// (helper) common code for find(), findMany(), findOne()
const findCommon = async (req: Request, args: unknown, getOne = false) => {
  const { userId } = auth(req);
  const [{ id, query }, adminTenants] = await Promise.all([
    getOne ? idSchema.concat(querySchema).validate(args) : { ...(await querySchema.validate(args)), id: null },
    Tenant.find({ admins: userId }).lean(),
  ]);

  return searchFilter<ClassroomDocument>(
    id ? [] : searchableFields,
    { query },
    {
      ...(id && { _id: id }),
      $or: [
        { teachers: userId },
        { students: userId, deletedAt: { $exists: false } },
        { tenant: { $in: adminTenants } },
      ],
    },
  );
};

/**
 * Find Multiple Classroom (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<ClassroomDocumentEx[]> => {
  const { userId, userTenants } = auth(req);
  const filter = await findCommon(req, args);

  const [classrooms, tenants] = await Promise.all([
    Classroom.find(filter, adminSelect).populate(populate).lean(), // always get remarks (for now)
    Tenant.find({ _id: { $in: userTenants } }).lean(),
  ]);

  return Promise.all(classrooms.map(async classroom => transform(userId, classroom, tenants)));
};

/**
 * Find Multiple Classrooms with queryString (RESTful)
 * ! year would & should be provided /?search=year
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userTenants } = auth(req);
    const filter = await findCommon(req, { query: req.query });
    const options = paginateSort(req.query, { updatedAt: 1 });

    const [total, classrooms, tenants] = await Promise.all([
      Classroom.countDocuments(filter),
      Classroom.find(filter, adminSelect, options).populate(populate).lean(),
      // always get remarks (for now)
      Tenant.find({ _id: { $in: userTenants } }).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: await Promise.all(classrooms.map(async classroom => transform(userId, classroom, tenants))),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Classroom by ID
 */
const findOne = async (req: Request, args: unknown): Promise<ClassroomDocumentEx | null> => {
  const { userId } = auth(req);
  const filter = await findCommon(req, args, true);

  const classroom = await Classroom.findOne(filter, adminSelect).populate(populate).lean(); // always get remarks (for now)
  if (!classroom) return null;

  const tenant = await Tenant.findByTenantId(classroom.tenant);
  return transform(userId, classroom, [tenant]);
};

/**
 * Find One Classroom by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const classroom = await findOne(req, { id: req.params.id });
    classroom ? res.status(200).json({ data: classroom }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Recall a classroom chat content
 */
const recallContent = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, chatId, contentId } = await chatIdSchema.concat(contentIdSchema).concat(idSchema).validate(args);

  const [original, chat, content] = await Promise.all([
    Classroom.findOne({
      _id: id,
      $or: [{ students: userId }, { teachers: userId }],
      chats: chatId,
      tenant: { $in: userTenants },
      deletedAt: { $exists: false },
    }).lean(),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
    Content.findOne({
      _id: contentId,
      parents: `/chats/${chatId}`,
      creator: userId,
      flags: { $nin: [CONTENT.FLAG.BLOCKED, CONTENT.FLAG.RECALLED] },
    }).lean(),
  ]);
  if (!original || !chat || !content) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true, populate }).lean(), // indicating there is an update (in grandchild)
    Tenant.findByTenantId(original.tenant),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    Content.updateOne(
      { _id: contentId },
      { $addToSet: { flags: CONTENT.FLAG.RECALLED }, data: `${CONTENT_PREFIX.RECALLED}#${Date.now()}###${userId}` },
    ),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'recallContent', { chatId, contentId, data: content.data }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [...original.teachers, ...original.students] },
      { chatGroupIds, classroomIds, contentIds: [contentId] },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:recallContent()', { id, chatId, contentId }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Recover (un-remove)
 * (only teacher or tenantAdmins could block content)
 */
const recover = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  const original = await checkPermission(id, userId, userTenants, { skipDeleteCheck: true });
  if (!original.deletedAt) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(
      id,
      { $unset: { deletedAt: 1 }, ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
      { fields: adminSelect, new: true, populate },
    ).lean(),
    Tenant.findByTenantId(original.tenant),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'RECOVER', { remark }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [userId, ...original.teachers, ...original.students] },
      { classroomIds: [id] },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:recover()', { id, remark }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Delete by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userTenants } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  const original = await checkPermission(id, userId, userTenants);

  await Promise.all([
    Classroom.updateOne(
      { _id: id },
      { deletedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
    ).lean(),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'DELETE', { remark }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [userId, ...original.teachers, ...original.students] },
      { classroomIds: [id] },
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
 * Share an homework(with assignment) to this classroom
 */
const shareHomework = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, sourceId: homeworkId } = await idSchema.concat(sourceIdSchema).validate(args);

  const [original, homework] = await Promise.all([
    checkPermission(id, userId, userTenants),
    Homework.findOne({ _id: homeworkId, deletedAt: { $exists: false } }).lean(),
  ]);
  const assignment =
    homework &&
    (await Assignment.findOne({
      _id: homework.assignment,
      classroom: id,
      homeworks: homeworkId,
      deletedAt: { $exists: false },
    }).lean());

  if (!assignment || !idsToString(original.assignments).includes(assignment._id.toString()))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // create a new chat from assignment & homework, and then attach to classroom
  const chat = new Chat<Partial<ChatDocument & Id>>({ parents: [`/classrooms/${id}`] });

  // if using Book Assignment
  const bookAssignmentId = assignment.bookAssignments[homework.assignmentIdx];
  const bookAssignment = bookAssignmentId ? await BookAssignment.findById(bookAssignmentId).lean() : null;
  if (bookAssignment) chat.contents.push(bookAssignment.content);
  const dynIdxContent =
    bookAssignment && typeof homework.dynParamIdx === 'number'
      ? new Content<Partial<ContentDocument & Id>>({
          parents: [`/chats/${chat._id}`],
          creator: userId,
          data: `dynParamIdx:${homework.dynParamIdx}`,
        })
      : null;
  if (dynIdxContent) chat.contents.push(dynIdxContent._id);

  // if using manual assignment
  const manualAssignment = assignment.manualAssignments[homework.assignmentIdx];
  const assignmentContent = manualAssignment
    ? new Content<Partial<ContentDocument & Id>>({
        parents: [`/chats/${chat._id}`],
        creator: userId,
        data: manualAssignment,
      })
    : null;
  if (assignmentContent) chat.contents.push(assignmentContent._id);

  chat.contents.push(...idsToString(homework.contents)); // append students works
  await chat.save(); //must save chat before classroom populating

  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { $push: { chats: chat } }, { fields: adminSelect, new: true, populate }).lean(),
    Tenant.findByTenantId(original.tenant),
    assignmentContent && assignmentContent.save(),
    dynIdxContent && dynIdxContent.save(),
    Content.updateMany({ _id: { $in: homework.contents } }, { $addToSet: { parents: `/chats/${chat._id}` } }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [...original.teachers, ...original.students] },
      { classroomIds: [id], chatIds: [chat], contentIds: chat.contents },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:shareHomework()', { id, homeworkId }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Share an question to this classroom
 */
const shareQuestion = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, sourceId: questionId } = await idSchema.concat(sourceIdSchema).validate(args);

  const [original, question] = await Promise.all([
    checkPermission(id, userId, userTenants),
    Question.findOne({ _id: questionId, classroom: id, tutor: userId, deletedAt: { $exists: false } }).lean(),
  ]);

  if (!question || original.tenant.toString() !== question.tenant.toString())
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // must create chat before classroom populating
  const chat = await Chat.create<Partial<ChatDocument & Id>>({
    parents: [`/classrooms/${id}`],
    contents: idsToString(question.contents),
  });

  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { $push: { chats: chat } }, { fields: adminSelect, new: true, populate }).lean(),
    Tenant.findByTenantId(original.tenant),
    Content.updateMany({ _id: { $in: question.contents } }, { $addToSet: { parents: `/chats/${chat._id}` } }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [...original.teachers, ...original.students] },
      { classroomIds: [id], chatIds: [chat], contentIds: chat.contents },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:shareQuestion()', { id, questionId }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update
 * ! only some fields are mutable
 */
const update = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, ...fields } = await classroomExtraSchema.concat(idSchema).validate(args);

  const original = await checkPermission(id, userId, userTenants);

  const books = await Book.countDocuments({
    _id: { $in: fields.books },
    level: original.level,
    subjects: original.subject,
  });
  if (fields.books.length !== books) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, fields, {
      fields: adminSelect,
      new: true,
      populate,
    }).lean(),
    Tenant.findByTenantId(original.tenant),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'UPDATE', { original, update: fields }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [userId, ...original.teachers, ...original.students] },
      { classroomIds: [id] },
    ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', `classroomController:update()`, { id, ...fields }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Flag (in members)
 * !member's flag is personal, no need to notify other users
 */
const updateChatFlag = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'setChatFlag' | 'clearChatFlag'>,
): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, chatId, flag } = await chatIdSchema.concat(flagSchema).concat(idSchema).validate(args);

  const [original, chat] = await Promise.all([
    Classroom.findOne({
      _id: id,
      $or: [{ students: userId }, { teachers: userId }],
      tenant: { $in: userTenants },
      chats: chatId,
      deletedAt: { $exists: false },
    }).lean(),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!Object.keys(CHAT.MEMBER.FLAG).includes(flag) || !original || !chat)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userChatMember = chat.members.find(m => m.user.toString() === userId);
  const updateMembers =
    action === 'clearChatFlag' && userChatMember?.flags.includes(flag)
      ? chat.members.map(m => (m.user.toString() === userId ? { ...m, flags: m.flags.filter(f => f !== flag) } : m))
      : action === 'setChatFlag' && !userChatMember
      ? [...chat.members, { user: userId, flags: [flag] }]
      : action === 'setChatFlag' && userChatMember && !userChatMember.flags.includes(flag)
      ? chat.members.map(m => (m.user.toString() === userId ? { ...m, flags: [...m.flags, flag] } : m))
      : null;

  if (updateMembers) await Chat.updateOne({ _id: chat }, { members: updateMembers }); // must update chat before classroom update & populate

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true, populate }).lean(),
    Tenant.findByTenantId(original.tenant),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    updateMembers &&
      notifySync(
        'CLASSROOM',
        { tenantId: original.tenant, userIds: [userId] },
        { chatGroupIds, classroomIds, chatIds: [chatId] },
      ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', `classroomController:${action}()`, { id, chatId, flag }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Chat LastViewedAt
 */
const updateChatLastViewedAt = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const {
    id,
    chatId,
    timestamp = new Date(),
  } = await chatIdSchema.concat(idSchema).concat(optionalTimestampSchema).validate(args);

  const [original, chat] = await Promise.all([
    Classroom.findOne({
      _id: id,
      $or: [{ students: userId }, { teachers: userId }],
      tenant: { $in: userTenants },
      chats: chatId,
      deletedAt: { $exists: false },
    }).lean(),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!original || !chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // // !Note: not work without arrayFilters (not sure what is wrong?)
  // const chat =
  //   (await Chat.findOneAndUpdate(
  //     { _id: chatId, parents: `/chatGroups/${id}`, 'members.user': userId },
  //     { $set: { 'members.$[elem].lastViewedAt': timestamp } },
  //     { arrayFilters: [{ 'elem.user': userId }] },
  //   ).lean()) ??
  //   (await Chat.findOneAndUpdate(
  //     { _id: chatId, parents: `/chatGroups/${id}`, 'members.user': { $ne: userId } },
  //     { $push: { members: { user: userId, flags: [], lastViewedAt: timestamp } } },
  //   ).lean());
  // if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // must update chat before classroom populating
  await Chat.updateOne(
    { _id: chat },
    chat.members.find(m => m.user.toString() === userId)
      ? { members: chat.members.map(m => (m.user.toString() === userId ? { ...m, lastViewedAt: timestamp } : m)) }
      : { members: [...chat.members, { user: userId, flags: [], lastViewedAt: timestamp }] },
  );

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true, populate }).lean(),
    Tenant.findByTenantId(original.tenant),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [userId] },
      { chatGroupIds, classroomIds, chatIds: [chatId] },
    ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:updateChatLastViewedAt()', { id, chatId, timestamp }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Chat Title
 */
const updateChatTitle = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, chatId, title } = await chatIdSchema.concat(idSchema).concat(optionalTitleSchema).validate(args);

  const [original, chat] = await Promise.all([
    checkPermission(id, userId, userTenants),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!idsToString(original.chats).includes(chatId) || !chat)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Chat.updateOne({ _id: chat }, title ? { title } : { $unset: { title: 1 } }); // must update chat before classroom populating

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true, populate }).lean(), // indicating there is an update (in grandchild)
    Tenant.findByTenantId(original.tenant),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'updateChatTitle', { chatId, title }),
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [userId, ...original.teachers, ...original.students] },
      { chatGroupIds, classroomIds, chatIds: [chatId] },
    ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:blockContent()', { id, chatId, title }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * updateMembers: updateStudents, updateTeachers
 * note: only classroom teacher or tenantAdmins could update
 */
const updateMembers = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'updateStudents' | 'updateTeachers'>,
): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, userIds } = await idSchema.concat(userIdsSchema).validate(args);

  const original = await checkPermission(id, userId, userTenants);
  const users = await User.find({ _id: { $in: userIds }, tenants: original.tenant }, '_id').lean();
  if (users.length !== userIds.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { students, teachers } = original;
  const sanitizedUserIds =
    action === 'updateTeachers' && idsToString(teachers).includes(userId)
      ? uniqueIds([userId, ...userIds])
      : uniqueIds(userIds);

  const [classroom, tenant] = await Promise.all([
    Classroom.findByIdAndUpdate(
      id,
      action === 'updateTeachers' ? { teachers: sanitizedUserIds } : { students: sanitizedUserIds },
      { fields: adminSelect, new: true, populate },
    ).lean(),
    Tenant.findByTenantId(original.tenant),
    // (action === 'addStudents' || action === 'addTeachers') &&
    //   Chat.updateMany(
    //     { _id: { $in: original.chats }, 'members.user': { $nin: users } },
    //     { $addToSet: { members: { $each: users.map(user => ({ user, flags: [] })) } } },
    //   ),
    // action === 'addStudents' || action === 'addTeachers'
    //   ? Promise.all([
    //       // undo (pull) 'REMOVED' from members.flags whom previously removed
    //       Chat.updateMany(
    //         { _id: { $in: original.chats }, 'members.user': { $in: uniqueUserIds } },
    //         { $pull: { 'members.$[elem].flags': CHAT.MEMBER.FLAG.REMOVED } },
    //         { arrayFilters: [{ 'elem.user': { $in: uniqueUserIds } }], multi: true },
    //       ),
    //       // add newMembers into chat.members
    //       Chat.updateMany(
    //         { _id: { $in: original.chats }, 'members.user': { $nin: uniqueUserIds } },
    //         { $addToSet: { members: { $each: uniqueUserIds.map(user => ({ user, flags: [] })) } } },
    //       ),
    //     ])
    //   : Chat.updateMany(
    //       { _id: { $in: original.chats }, 'members.user': { $in: uniqueUserIds } },
    //       { $push: { 'members.$[elem].flags': CHAT.MEMBER.FLAG.REMOVED } },
    //       { arrayFilters: [{ 'elem.user': { $in: uniqueUserIds } }], multi: true },
    //     ),

    DatabaseEvent.log(userId, `/classrooms/${id}`, action, { teachers, students, userIds }), // backup original teachers & students
    notifySync(
      'CLASSROOM',
      { tenantId: original.tenant, userIds: [...teachers, ...students, ...users, userId] },
      { classroomIds: [id] },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', `classroomController:updateMembers() ${action}`, { id, userIds }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
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
      case 'addContent':
        return res.status(200).json({ data: await addContent(req, { id, ...req.body }) });
      case 'addContentWithNewChat':
        return res.status(200).json({ data: await addContentWithNewChat(req, { id, ...req.body }) });
      case 'addRemark':
        return res.status(200).json({ data: await addRemark(req, { id, ...req.body }) });
      case 'attachChatGroup':
      case 'attachClassroom':
        return res.status(200).json({ data: await attach(req, { id, ...req.body }, action) });
      case 'blockContent':
        return res.status(200).json({ data: await blockContent(req, { id, ...req.body }) });
      case 'clearChatFlag':
        return res.status(200).json({ data: await updateChatFlag(req, { id, ...req.body }, action) });
      case 'recallContent':
        return res.status(200).json({ data: await recallContent(req, { id, ...req.body }) });
      case 'recover':
        return res.status(200).json({ data: await recover(req, { id, ...req.body }) });
      case 'setChatFlag':
        return res.status(200).json({ data: await updateChatFlag(req, { id, ...req.body }, action) });
      case 'shareHomework':
        return res.status(200).json({ data: await shareHomework(req, { id, ...req.body }) });
      case 'shareQuestion':
        return res.status(200).json({ data: await shareQuestion(req, { id, ...req.body }) });
      case 'updateChatTitle':
        return res.status(200).json({ data: await updateChatTitle(req, { id, ...req.body }) });
      case 'updateChatLastViewedAt':
        return res.status(200).json({ data: await updateChatLastViewedAt(req, { id, ...req.body }) });
      case 'updateStudents':
      case 'updateTeachers':
        return res.status(200).json({ data: await updateMembers(req, { id, ...req.body }, action) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  addContent,
  addContentWithNewChat,
  addRemark,
  attach,
  blockContent,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  recallContent,
  recover,
  remove,
  removeById,
  shareHomework,
  shareQuestion,
  update,
  updateById,
  updateChatFlag,
  updateChatLastViewedAt,
  updateChatTitle,
  updateMembers,
};
