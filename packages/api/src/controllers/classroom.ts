/**
 * Controller: Classroom
 *
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { FilterQuery, Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import Assignment from '../models/assignment';
import Book, { BookAssignment } from '../models/book';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import type { ChatGroupDocument } from '../models/chat-group';
import ChatGroup from '../models/chat-group';
import type { ClassroomDocument } from '../models/classroom';
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
import { extract } from '../utils/chat';
import { schoolYear } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
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

type Populate = { chats: ChatDocument[] };
type PopulatedClassroom = Omit<ClassroomDocument, 'chats'> & Populate;
type ClassroomDocumentEx = PopulatedClassroom & { contentsToken: string };

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
const findOneClassroom = async (
  id: string,
  userId: Types.ObjectId,
  userTenants: string[],
  roles: ('student' | 'teacher' | 'tenantAdmin')[],
  extraFilter: FilterQuery<ClassroomDocument> = {},
) => {
  const classroom = await Classroom.findOne({
    _id: id,
    tenant: { $in: userTenants },
    year: { $in: [schoolYear(), schoolYear(1)] }, // allow to update this schoolYear or next schoolYear
    deletedAt: { $exists: false },
    ...extraFilter,
  }).lean();
  if (!classroom) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tenant = await Tenant.findByTenantId(classroom.tenant);

  if (
    (roles.includes('student') && classroom.students.some(s => s.equals(userId))) ||
    (roles.includes('teacher') && classroom.teachers.some(t => t.equals(userId))) ||
    (roles.includes('tenantAdmin') && tenant.admins.some(a => a.equals(userId)))
  )
    return { classroom, tenant };

  throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
};

/**
 * (helper) get parentId from chat.parents
 */
const otherParentIds = (chat: ChatDocument, classroomId: Types.ObjectId) => {
  const chatGroupIds = chat.parents.filter(p => p.startsWith('/chatGroups')).map(p => p.replace('/chatGroups/', ''));
  const classroomIds = chat.parents.filter(p => p.startsWith('/classrooms')).map(p => p.replace('/classrooms/', ''));
  const otherClassroomIds = classroomIds.filter(id => !classroomId.equals(id));

  return { chatGroupIds, classroomIds, otherClassroomIds };
};

/**
 * (helper) generate contentsToken
 */
const transform = async (
  userId: Types.ObjectId,
  classroom: PopulatedClassroom,
  tenants: TenantDocument[],
): Promise<ClassroomDocumentEx> => ({
  ...classroom,
  remarks:
    classroom.teachers.some(t => t.equals(userId)) ||
    (tenants.find(t => t._id.equals(classroom.tenant))?.admins || []).some(a => a.equals(userId))
      ? classroom.remarks
      : [],
  contentsToken: await signContentIds(userId, classroom.chats.map(chat => chat.contents).flat()),
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

  const [{ classroom: original, tenant }, chat] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['student', 'teacher'], { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chatId}`],
    creator: userId,
    data,
    visibleAfter,
  });

  const memberExists = chat.members.some(m => m.user.equals(userId));
  await Chat.updateOne(
    { _id: chatId },
    {
      ...(memberExists && {
        members: chat.members.map(m => (m.user.equals(userId) ? { ...m, lastViewedAt: new Date() } : m)),
      }),
      $push: {
        contents: content._id,
        ...(!memberExists && { members: { user: userId, flags: [], lastViewedAt: new Date() } }),
      },
    },
  ); // must update chat before chatGroup populating

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true })
      .populate<Populate>(populate)
      .lean(),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    content.save(),
    notifySync(
      tenant._id,
      { userIds: [...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chatGroups: [
            { updateMany: { filter: { _id: { $in: chatGroupIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          chats: [
            {
              updateOne: {
                filter: { _id: chatId },
                update: { $addToSet: { contents: content._id } },
              },
            },
            {
              updateOne: {
                filter: { _id: chatId, 'members.user': userId },
                update: { $max: { 'members.$.lastViewedAt': new Date() } },
              },
            },
            {
              updateOne: {
                filter: { _id: chatId, 'members.user': { $ne: userId } },
                update: { $push: { members: { user: userId, flags: [], lastViewedAt: new Date() } } },
              },
            },
          ] satisfies BulkWrite<ChatDocument>,
          classrooms: [
            { updateMany: { filter: { _id: { $in: classroomIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ClassroomDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:addContent()', args, userId);
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

  const { classroom: original, tenant } = await findOneClassroom(id, userId, userTenants, ['student', 'teacher']);

  const content = new Content<Partial<ContentDocument>>({ creator: userId, data, visibleAfter });

  // must create chat before classroom update & populate
  const chat = await Chat.create<Partial<ChatDocument>>({
    parents: [`/classrooms/${id}`],
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    contents: [content._id],
    ...(title && { title }),
  });
  content.parents = [`/chats/${chat._id}`];

  const { otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const update: UpdateQuery<ClassroomDocument> = { $push: { chats: chat._id } };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    content.save(),
    notifySync(
      tenant._id,
      { userIds: [...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chatGroups: [
            {
              updateMany: { filter: { _id: { $in: chatGroupIds } }, update: { updatedAt: new Date() } },
            },
          ] satisfies BulkWrite<ChatGroupDocument>,
          chats: [{ insertOne: { document: chat } }] satisfies BulkWrite<ChatDocument>,
          classrooms: [
            { updateOne: { filter: { _id: id }, update } },
            { updateMany: { filter: { _id: { $in: otherClassroomIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ClassroomDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:addContentWithNewChat()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const { classroom: original, tenant } = await findOneClassroom(id, userId, userTenants, ['teacher', 'tenantAdmin']);

  const update: UpdateQuery<ClassroomDocument> = { $push: { remarks: { t: new Date(), u: userId, m: remark } } };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'REMARK', { args }),
    notifySync(
      tenant._id,
      { userIds: [...original.teachers, userId], event: 'CLASSROOM' },
      {
        bulkWrite: {
          classrooms: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:addRemark()', args, userId);
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

  const [{ classroom: original, tenant }, source] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['teacher'], { chats: { $ne: chatId } }),
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
        }).lean(), // allow to attach a very old classroom chat
  ]);
  if (!source || !source.tenant?.equals(original.tenant)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const chatUpdate: UpdateQuery<ChatDocument> = { $addToSet: { parents: `/classrooms/${id}` } };
  const chat = await Chat.findOneAndUpdate(
    {
      _id: chatId,
      parents: `/${action === 'attachChatGroup' ? 'chatGroups' : 'classrooms'}/${sourceId}`,
      deletedAt: { $exists: false },
    },
    chatUpdate,
  ).lean(); // must update chats before classroom populating
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const update: UpdateQuery<ClassroomDocument> = { $push: { chats: chat._id } };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    notifySync(
      tenant._id,
      { userIds: [...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chats: [{ updateOne: { filter: { _id: chatId }, update: chatUpdate } }] satisfies BulkWrite<ChatDocument>,
          classrooms: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', `classroomController:${action}()`, args, userId);
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

  const [{ classroom: original, tenant }, chat, content] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['teacher', 'tenantAdmin'], { chats: chatId }),
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
  if (!chat || !content) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const contentUpdate: UpdateQuery<ContentDocument> = {
    $addToSet: { flags: CONTENT.FLAG.BLOCKED },
    data: `${CONTENT_PREFIX.BLOCKED}#${Date.now()}###${userId}`,
  };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(
      id,
      {
        updatedAt: new Date(),
        ...(remark && {
          $push: { remarks: { t: new Date(), u: userId, m: `blockContent (${chatId}-${contentId}): ${remark}` } },
        }),
      },
      { fields: adminSelect, new: true },
    )
      .populate<Populate>(populate)
      .lean(), // indicating there is an update (in grandchild)
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    Content.updateOne({ _id: contentId }, contentUpdate),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'blockContent', { args, data: content.data }),
    notifySync(
      tenant._id,
      { userIds: [userId, ...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chatGroups: [
            { updateMany: { filter: { _id: { $in: chatGroupIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          classrooms: [
            { updateMany: { filter: { _id: { $in: classroomIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ClassroomDocument>,
          contents: [
            { updateOne: { filter: { _id: content._id }, update: contentUpdate } },
          ] satisfies BulkWrite<ContentDocument>,
        },
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:blockContent()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Create New Classroom
 * only tenantAdmin could create classroom
 */
const create = async (req: Request, args: unknown): Promise<PopulatedClassroom> => {
  const { userId, userTenants } = auth(req);
  const { tenantId, ...inputFields } = await classroomCoreSchema.concat(classroomExtraSchema).validate(args);

  const [books, level, subject, tenant] = await Promise.all([
    Book.find(
      {
        _id: { $in: inputFields.books },
        level: inputFields.level,
        subjects: inputFields.subject,
        deletedAt: { $exists: false },
      },
      '_id',
    ).lean(),
    Level.exists({ _id: inputFields.level, deletedAt: { $exists: false } }),
    Subject.exists({ _id: inputFields.subject, levels: inputFields.level, deletedAt: { $exists: false } }),
    Tenant.findByTenantId(tenantId, userId),
  ]);

  if (!userTenants.includes(tenantId) || !tenant.services.includes(TENANT.SERVICE.CLASSROOM))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  if (!level || !subject || inputFields.books.length !== books.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const classroom = new Classroom<Partial<ClassroomDocument>>({
    tenant: tenant._id,
    ...inputFields,
    books: books.map(b => b._id),
    subject: subject._id,
    level: level._id,
  });

  const [transformed] = await Promise.all([
    transform(userId, classroom.toObject(), [tenant]),
    classroom.save(),
    DatabaseEvent.log(userId, `/classrooms/${classroom._id}`, 'CREATE', { args }),
    notifySync(
      classroom.tenant,
      { userIds: [userId], event: 'CLASSROOM' },
      {
        bulkWrite: {
          classrooms: [{ insertOne: { document: classroom } }] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
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
  const { userId, userTenants } = auth(req);
  const [{ id, query }, adminTenants] = await Promise.all([
    getOne ? idSchema.concat(querySchema).validate(args) : { ...(await querySchema.validate(args)), id: null },
    Tenant.findAdminTenants(userId, userTenants),
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
    Classroom.find(filter, adminSelect).populate<Populate>(populate).lean(), // always get remarks (for now)
    Tenant.findAdminTenants(userId, userTenants),
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
    const options = paginateSort(req.query, { updatedAt: -1 });

    const [total, classrooms, tenants] = await Promise.all([
      Classroom.countDocuments(filter),
      Classroom.find(filter, adminSelect, options).populate<Populate>(populate).lean(), // always get remarks, transform() might hide remarks
      Tenant.findAdminTenants(userId, userTenants),
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

  const classroom = await Classroom.findOne(filter, adminSelect).populate<Populate>(populate).lean(); // always get remarks (for now)
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

  const [{ classroom: original, tenant }, chat, content] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['student', 'teacher'], { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
    Content.findOne({
      _id: contentId,
      parents: `/chats/${chatId}`,
      creator: userId,
      flags: { $nin: [CONTENT.FLAG.BLOCKED, CONTENT.FLAG.RECALLED] },
    }).lean(),
  ]);
  if (!chat || !content) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const contentUpdate: UpdateQuery<ContentDocument> = {
    $addToSet: { flags: CONTENT.FLAG.RECALLED },
    data: `${CONTENT_PREFIX.RECALLED}#${Date.now()}###${userId}`,
  };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true })
      .populate<Populate>(populate)
      .lean(), // indicating there is an update (in grandchild)
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    Content.updateOne({ _id: contentId }, contentUpdate),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'recallContent', { args, data: content.data }),
    notifySync(
      tenant._id,
      { userIds: [...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chatGroups: [
            { updateMany: { filter: { _id: { $in: chatGroupIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          classrooms: [
            { updateMany: { filter: { _id: { $in: classroomIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ClassroomDocument>,
          contents: [
            { updateOne: { filter: { _id: content._id }, update: contentUpdate } },
          ] satisfies BulkWrite<ContentDocument>,
        },
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:recallContent()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Recover (un-remove)
 * (only teacher or tenantAdmins could block content)
 */
const recover = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  const { classroom: original, tenant } = await findOneClassroom(id, userId, userTenants, ['teacher', 'tenantAdmin'], {
    deletedAt: { $exists: true },
  });

  const update: UpdateQuery<ClassroomDocument> = {
    $unset: { deletedAt: 1 },
    ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: `recover: ${remark}` } } }),
  };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'RECOVER', { args }),
    notifySync(
      tenant._id,
      { userIds: [userId, ...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          classrooms: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:recover()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Delete by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userTenants } = auth(req);
  const { id, remark } = await removeSchema.validate(args);

  const { classroom: original, tenant } = await findOneClassroom(id, userId, userTenants, ['teacher', 'tenantAdmin']); // teacher or tenantAdmin could proceed

  const update: UpdateQuery<ClassroomDocument> = {
    deletedAt: new Date(),
    ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
  };
  await Promise.all([
    Classroom.updateOne({ _id: id }, update).lean(),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'DELETE', { args }),
    notifySync(
      tenant._id,
      { userIds: [userId, ...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          classrooms: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ClassroomDocument>,
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
 * Share an homework(with assignment) to this classroom
 */
const shareHomework = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userLocale, userTenants } = auth(req);
  const { id, sourceId: homeworkId } = await idSchema.concat(sourceIdSchema).validate(args);

  const homework = await Homework.findOne({ _id: homeworkId, deletedAt: { $exists: false } }).lean();
  if (!homework) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [{ classroom: original, tenant }, assignment] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['teacher'], { assignments: homework.assignment }),
    Assignment.findOne({
      _id: homework.assignment,
      classroom: id,
      homeworks: homeworkId,
      deletedAt: { $exists: false },
    }).lean(),
  ]);
  if (!assignment) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // create a new chat from assignment & homework, and then attach to classroom
  const msg = { enUS: `Sharing Homework`, zhCN: `分享功課`, zhHK: `分享功課` };
  const content = new Content<Partial<ContentDocument>>({ creator: userId, data: extract(msg, userLocale) });

  const chat = new Chat<Partial<ChatDocument>>({ parents: [`/classrooms/${id}`], contents: [content._id] });
  content.parents = [`/chats/${chat._id}`];

  // if using Book Assignment
  const bookAssignmentId = assignment.bookAssignments[homework.assignmentIdx];
  const bookAssignment = bookAssignmentId ? await BookAssignment.findById(bookAssignmentId).lean() : null;
  if (bookAssignment) chat.contents.push(bookAssignment.content);

  const dynIdxContent =
    bookAssignment && typeof homework.dynParamIdx === 'number'
      ? new Content<Partial<ContentDocument>>({
          parents: [`/chats/${chat._id}`],
          creator: userId,
          data: `dynParamIdx:${homework.dynParamIdx}`,
        })
      : null;
  if (dynIdxContent) chat.contents.push(dynIdxContent._id);

  // if using manual assignment
  const manualAssignment = assignment.manualAssignments[homework.assignmentIdx];
  const assignmentContent = manualAssignment
    ? new Content<Partial<ContentDocument>>({
        parents: [`/chats/${chat._id}`],
        creator: userId,
        data: manualAssignment,
      })
    : null;
  if (assignmentContent) chat.contents.push(assignmentContent._id);

  const newContents = [content];
  if (dynIdxContent) newContents.push(dynIdxContent);
  if (assignmentContent) newContents.push(assignmentContent);
  chat.contents.push(...homework.contents); // append students works
  await chat.save(); //must save chat before classroom populating

  const update: UpdateQuery<ClassroomDocument> = { $push: { chats: chat._id } };
  const contentUpdate: UpdateQuery<ContentDocument> = { $addToSet: { parents: `/chats/${chat._id}` } };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    Content.insertMany(newContents, { rawResult: true }),
    Content.updateMany({ _id: { $in: homework.contents } }, contentUpdate),
    notifySync(
      tenant._id,
      { userIds: [...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chats: [{ insertOne: { document: chat } }] satisfies BulkWrite<ChatDocument>,
          classrooms: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ClassroomDocument>,
          contents: [
            { updateMany: { filter: { _id: { $in: homework.contents } }, update: contentUpdate } },
            ...(assignmentContent ? [{ insertOne: { document: assignmentContent } }] : []),
            ...(dynIdxContent ? [{ insertOne: { document: dynIdxContent } }] : []),
          ] satisfies BulkWrite<ContentDocument>,
        },
        contentsToken: await signContentIds(
          null,
          newContents.map(c => c._id),
        ),
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:shareHomework()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Share an question to this classroom
 */
const shareQuestion = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userLocale, userTenants } = auth(req);
  const { id, sourceId: questionId } = await idSchema.concat(sourceIdSchema).validate(args);

  const [{ classroom: original, tenant }, question] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['teacher']),
    Question.findOne({ _id: questionId, classroom: id, tutor: userId, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!question || !original.tenant.equals(question.tenant)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // must create chat before classroom populating
  const msg = { enUS: `Sharing Question`, zhCN: `分享提问`, zhHK: `分享提問` };
  const content = new Content<Partial<ContentDocument>>({ creator: userId, data: extract(msg, userLocale) });

  const chat = await Chat.create<Partial<ChatDocument>>({
    parents: [`/classrooms/${id}`],
    contents: [content._id, ...question.contents],
  });
  content.parents = [`/chats/${chat._id}`];

  const update: UpdateQuery<ClassroomDocument> = { $push: { chats: chat._id } };
  const contentUpdate: UpdateQuery<ContentDocument> = { $addToSet: { parents: `/chats/${chat._id}` } };

  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    Content.updateMany({ _id: { $in: question.contents } }, contentUpdate),
    Content.insertMany(content),
    notifySync(
      tenant._id,
      { userIds: [...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          classrooms: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ClassroomDocument>,
          chats: [{ insertOne: { document: chat } }] satisfies BulkWrite<ChatDocument>,
          contents: [
            { updateMany: { filter: { _id: { $in: question.contents } }, update: contentUpdate } },
          ] satisfies BulkWrite<ContentDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:shareQuestion()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update
 * ! only some fields are mutable
 */
const update = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, ...inputFields } = await classroomExtraSchema.concat(idSchema).validate(args);

  // const original = await findOneClassroom(id, userId, userTenants);
  const { classroom: original, tenant } = await findOneClassroom(id, userId, userTenants, ['teacher', 'tenantAdmin']);

  const books = await Book.find(
    {
      _id: { $in: inputFields.books },
      level: original.level,
      subjects: original.subject,
      deletedAt: { $exists: false },
    },
    '_id',
  ).lean();
  if (inputFields.books.length !== books.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const update = { ...inputFields, books: books.map(b => b._id) };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'UPDATE', { original, args }),
    notifySync(
      tenant._id,
      { userIds: [userId, ...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          classrooms: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', `classroomController:update()`, args, userId);
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

  const [{ classroom: original, tenant }, chat] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['student', 'teacher'], { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!Object.keys(CHAT.MEMBER.FLAG).includes(flag) || !chat)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // must update chat before chatGroup populating
  chat.members.some(m => m.user.equals(userId))
    ? await Chat.updateOne(
        { _id: chatId, 'members.user': userId },
        {
          'members.$.lastViewedAt': new Date(),
          ...(action === 'setChatFlag'
            ? { $addToSet: { 'members.$.flags': flag } }
            : { $pull: { 'members.$.flags': flag } }),
        },
      )
    : action === 'setChatFlag' &&
      (await Chat.updateOne(
        { _id: chatId },
        { $push: { members: { user: userId, flags: [flag], lastViewedAt: new Date() } } },
      ));

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true })
      .populate<Populate>(populate)
      .lean(),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    notifySync(
      tenant._id,
      { userIds: [...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chatGroups: [
            { updateMany: { filter: { _id: { $in: chatGroupIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          chats: [
            {
              updateOne: {
                filter: { _id: chatId, 'members.user': userId },
                update: {
                  $max: { 'members.$.lastViewedAt': new Date() },
                  ...(action === 'setChatFlag'
                    ? { $addToSet: { 'members.$.flags': flag } }
                    : { $pull: { 'members.$.flags': flag } }),
                },
              },
            },
            {
              updateOne: {
                filter: { _id: chatId, 'members.user': { $ne: userId } },
                update: {
                  $push: {
                    members: { user: userId, flags: action === 'setChatFlag' ? [flag] : [], lastViewedAt: new Date() },
                  },
                },
              },
            },
          ] satisfies BulkWrite<ChatDocument>,
          classrooms: [
            { updateMany: { filter: { _id: { $in: classroomIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', `classroomController:${action}()`, args, userId);
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

  const [{ classroom: original, tenant }, chat] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['student', 'teacher'], { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // must update chat before chatGroup populating
  await Chat.updateMany(
    { _id: chatId },
    chat.members.some(m => m.user.equals(userId))
      ? { members: chat.members.map(m => (m.user.equals(userId) ? { ...m, lastViewedAt: timestamp } : m)) }
      : { $push: { members: { user: userId, flags: [], lastViewedAt: timestamp } } },
  );

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true })
      .populate<Populate>(populate)
      .lean(),
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),

    notifySync(
      tenant._id,
      { userIds: [userId], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chatGroups: [
            { updateMany: { filter: { _id: { $in: chatGroupIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          chats: [
            {
              updateOne: {
                filter: { _id: chatId, 'members.user': userId },
                update: { $max: { 'members.$.lastViewedAt': timestamp } },
              },
            },
            {
              updateOne: {
                filter: { _id: chatId, 'members.user': { $ne: userId } },
                update: {
                  $push: { members: { user: userId, flags: [], lastViewedAt: timestamp } },
                },
              },
            },
          ] satisfies BulkWrite<ChatDocument>,
          classrooms: [
            { updateMany: { filter: { _id: { $in: classroomIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:updateChatLastViewedAt()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Chat Title
 */
const updateChatTitle = async (req: Request, args: unknown): Promise<ClassroomDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id, chatId, title } = await chatIdSchema.concat(idSchema).concat(optionalTitleSchema).validate(args);

  const [{ classroom: original, tenant }, chat] = await Promise.all([
    findOneClassroom(id, userId, userTenants, ['student', 'teacher'], { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/classrooms/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const chatUpdate: UpdateQuery<ChatDocument> = title ? { title } : { $unset: { title: 1 } };
  await Chat.updateOne({ _id: chat }, chatUpdate); // must update chat before classroom populating

  const { classroomIds, otherClassroomIds, chatGroupIds } = otherParentIds(chat, original._id);
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: adminSelect, new: true })
      .populate<Populate>(populate)
      .lean(), // indicating there is an update (in grandchild)
    otherClassroomIds.length && Classroom.updateMany({ _id: { $in: otherClassroomIds } }, { updatedAt: new Date() }),
    chatGroupIds.length && ChatGroup.updateMany({ _id: { $in: chatGroupIds } }, { updatedAt: new Date() }),
    DatabaseEvent.log(userId, `/classrooms/${id}`, 'updateChatTitle', { args }),
    notifySync(
      tenant._id,
      { userIds: [userId, ...original.teachers, ...original.students], event: 'CLASSROOM' },
      {
        bulkWrite: {
          chatGroups: [
            { updateMany: { filter: { _id: { $in: chatGroupIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          chats: [{ updateOne: { filter: { _id: chatId }, update: chatUpdate } }] satisfies BulkWrite<ChatDocument>,
          classrooms: [
            { updateMany: { filter: { _id: { $in: classroomIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
  ]);
  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', 'classroomController:blockContent()', args, userId);
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

  const {
    classroom: { students, teachers },
    tenant,
  } = await findOneClassroom(id, userId, userTenants, ['teacher', 'tenantAdmin']);

  if (action === 'updateTeachers' && teachers.some(t => t.equals(userId))) userIds.push(userId.toString());
  const users = await User.find({ _id: { $in: userIds }, tenants: tenant._id }, '_id').lean();
  const updatedUserIds = users.map(u => u._id);

  const update: UpdateQuery<ClassroomDocument> =
    action === 'updateStudents' ? { students: updatedUserIds } : { teachers: updatedUserIds };
  const [classroom] = await Promise.all([
    Classroom.findByIdAndUpdate(id, update, { fields: adminSelect, new: true }).populate<Populate>(populate).lean(),
    DatabaseEvent.log(userId, `/classrooms/${id}`, action, {
      args,
      original: action === 'updateStudents' ? students : teachers,
    }), // backup original teachers & students
    notifySync(
      tenant._id,
      { userIds: [...teachers, ...students, ...updatedUserIds, userId], event: 'CLASSROOM' },
      {
        bulkWrite: {
          classrooms: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ClassroomDocument>,
        },
      },
    ),
  ]);

  if (classroom) return transform(userId, classroom, [tenant]);
  log('error', `classroomController:updateMembers() ${action}`, args, userId);
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
