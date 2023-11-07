/**
 * Controller: ChatGroups
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import { addYears } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { FilterQuery, Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import Book from '../models/book';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import type { ChatGroupDocument } from '../models/chat-group';
import ChatGroup, { searchableFields } from '../models/chat-group';
import type { ClassroomDocument } from '../models/classroom';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import DatabaseEvent from '../models/event/database';
import Question from '../models/question';
import School from '../models/school';
import Tenant from '../models/tenant';
import User, { activeCond } from '../models/user';
import { extract, messageToAdmins, startChatGroup } from '../utils/chat';
import { mongoId } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';
import { censorContent, signContentIds } from './content';

type Action =
  | 'addContent'
  | 'addContentWithNewChat'
  | 'attachChatGroup'
  | 'blockContent'
  | 'clearChatFlag'
  | 'join'
  | 'joinBook'
  | 'leave'
  | 'recallContent'
  | 'setChatFlag'
  | 'shareQuestion'
  | 'updateAdmins'
  | 'updateChatTitle'
  | 'updateChatLastViewedAt'
  | 'updateUsers';
type To = 'toAdmin' | 'toAlex' | 'toTenantAdmins' | 'toTenantCounselors' | 'toTenantSupports';
type Populate = { chats: ChatDocument[] };
type PopulatedChatGroup = Omit<ChatGroupDocument, 'chats'> & Populate;
type ChatGroupDocumentEx = PopulatedChatGroup & { contentsToken: string };

const { MSG_ENUM } = LOCALE;
const { CONTENT, CHAT, CHAT_GROUP, TENANT } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const {
  assertUnreachable,
  auth,
  authGetUser,
  authCheckUserSuspension,
  hubModeOnly,
  isAdmin,
  isTeacher,
  paginateSort,
  searchFilter,
  select,
} = common;
const {
  chatGroupSchema,
  chatIdSchema,
  contentIdSchema,
  contentSchema,
  flagSchema,
  idSchema,
  optionalTimestampSchema,
  optionalTitleSchema,
  querySchema,
  sourceIdSchema,
  removeSchema,
  tenantIdSchema,
  userIdsSchema,
} = yupSchema;

const populate = [{ path: 'chats', select: select() }];

/**
 * (helper) findOne active chatGroup ADMIN (chatGroup.admin, tenantAdmin, or isAdmin)
 */
const findOneChatGroup = async (
  id: string,
  userId: Types.ObjectId,
  isAdmin: boolean,
  userTenants: string[],
  type: 'ADMIN' | 'USER',
  extraFilter: FilterQuery<ChatGroupDocument> = {},
) => {
  const chatGroup = await ChatGroup.findOne({
    _id: id,
    tenant: { $in: [...userTenants, undefined] }, // accessible only $in userTenants or undefined (adminMessage, )
    deletedAt: { $exists: false },
    ...extraFilter,
  }).lean();

  if (
    chatGroup &&
    ((type === 'USER' &&
      (chatGroup.users.some(u => u.equals(userId)) || chatGroup.marshals.some(m => m.equals(userId)))) ||
      (type === 'ADMIN' && chatGroup.admins.some(a => a.equals(userId))) ||
      (!chatGroup.tenant && isAdmin) ||
      (chatGroup.tenant && (await Tenant.findByTenantId(chatGroup.tenant, userId))))
  )
    return chatGroup;

  throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
};

/**
 * (helper) get parentId from chat.parents
 */
const otherParentIds = (chat: ChatDocument, chatGroupId: Types.ObjectId) => {
  const classroomIds = chat.parents.filter(p => p.startsWith('/classrooms')).map(p => p.replace('/classrooms/', ''));
  const chatGroupIds = chat.parents.filter(p => p.startsWith('/chatGroups')).map(p => p.replace('/chatGroups/', ''));
  const otherChatGroupIds = chatGroupIds.filter(id => !chatGroupId.equals(id));

  return { chatGroupIds, classroomIds, otherChatGroupIds };
};

/**
 * (helper) generate contentsToken
 */
const transform = async (userId: Types.ObjectId, chatGroup: PopulatedChatGroup): Promise<ChatGroupDocumentEx> => ({
  ...chatGroup,
  contentsToken: await signContentIds(userId, chatGroup.chats.map(chat => chat.contents).flat()),
});

/**
 * addContent
 */
const addContent = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userLocale, userRoles, userTenants } = auth(req);
  const [{ id, chatId, content: data, visibleAfter }] = await Promise.all([
    chatIdSchema.concat(contentSchema).concat(idSchema).validate(args),
    authCheckUserSuspension(req),
  ]);

  const [original, chat] = await Promise.all([
    findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'USER', { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chatId}`],
    creator: userId,
    data,
    visibleAfter,
  });

  const memberExists = chat.members.some(m => m.user.equals(userId));
  const [sysIds] = await Promise.all([
    !original.tenant && User.findSystemAccountIds(),
    Chat.updateOne(
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
    ), // must update chat before chatGroup populating
  ]);

  const { otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const update: UpdateQuery<ChatGroupDocument> = {
    updatedAt: new Date(),
    ...(sysIds && { $addToSet: { admins: { $each: sysIds.adminIds }, users: { $each: sysIds.adminIds } } }),
  }; // $addToSet system admins if need
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, update, { fields: select(), new: true }).populate<Populate>(populate).lean(),
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    Content.insertMany(content),
    original.tenant && censorContent(original.tenant, userId, userLocale, `/chatGroups/${id}`, content._id),
    notifySync(
      userTenants[0] ? mongoId(userTenants[0]) : null, // satellite priority: chatGroup.tenant -> userPrimaryTenant (in case of adminMessage)
      { userIds: original.users, event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [
            { updateOne: { filter: { _id: id }, update } },
            { updateMany: { filter: { _id: { $in: otherChatGroupIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          chats: [
            { updateOne: { filter: { _id: chatId }, update: { $addToSet: { contents: content._id } } } },
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

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:addContent()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * addContentWithNewChat
 */
const addContentWithNewChat = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userLocale, userRoles, userTenants } = auth(req);
  const [{ id, content: data, title, visibleAfter }] = await Promise.all([
    contentSchema.concat(idSchema).concat(optionalTitleSchema).validate(args),
    authCheckUserSuspension,
  ]);

  const original = await findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'USER');
  const content = new Content<Partial<ContentDocument>>({ creator: userId, data, visibleAfter });
  const chat = new Chat<Partial<ChatDocument>>({
    parents: [`/chatGroups/${id}`],
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    contents: [content._id],
    ...(title && { title }),
  });
  content.parents = [`/chats/${chat._id}`];

  // if chatGroup has no tenantId, it is admin chatGroup, $addToSet adminId
  const [sysIds] = await Promise.all([
    !original.tenant && User.findSystemAccountIds(),
    Chat.insertMany(chat),
    Content.insertMany(content),
  ]); // must save chat before chatGroup populating

  const { otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const update: UpdateQuery<ChatGroupDocument> = {
    $push: { chats: chat._id },
    ...(sysIds && { $addToSet: { admins: { $each: sysIds.adminIds }, users: { $each: sysIds.adminIds } } }),
  }; // $addToSet system admins
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, update, { fields: select(), new: true }).populate<Populate>(populate).lean(),
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    original.tenant && censorContent(original.tenant, userId, userLocale, `/chatGroups/${id}`, content._id),
    notifySync(
      userTenants[0] ? mongoId(userTenants[0]) : null, // satellite priority: chatGroup.tenant -> userPrimaryTenant (in case of adminMessage)
      { userIds: original.users, event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [
            { updateOne: { filter: { _id: id }, update } },
            { updateMany: { filter: { _id: { $in: otherChatGroupIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          chats: [{ insertOne: { document: chat } }] satisfies BulkWrite<ChatDocument>,
          classrooms: [
            { updateMany: { filter: { _id: { $in: classroomIds } }, update: { updatedAt: new Date() } } },
          ] satisfies BulkWrite<ClassroomDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:addContentWithNewChat()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Attach a chat (from another chatGroup) to this chatGroup (within the same tenantId)
 */
const attachChatGroup = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, chatId, sourceId } = await chatIdSchema.concat(idSchema).concat(sourceIdSchema).validate(args);

  const [original, source] = await Promise.all([
    findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'ADMIN', { chats: { $ne: chatId } }),
    findOneChatGroup(sourceId, userId, isAdmin(userRoles), userTenants, 'ADMIN', { chats: chatId }),
  ]);
  if (!original.tenant || !source.tenant?.equals(original.tenant))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const chatUpdate: UpdateQuery<ChatDocument> = { $addToSet: { parents: `/chatGroups/${id}` } };
  const { matchedCount } = await Chat.updateOne(
    { _id: chatId, parents: `/chatGroups/${sourceId}`, deletedAt: { $exists: false } },
    chatUpdate,
  ); // must update chats before chatGroup populating
  if (!matchedCount) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const update: UpdateQuery<ChatGroupDocument> = { $push: { chats: mongoId(chatId) } };
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, update, { fields: select(), new: true }).populate<Populate>(populate).lean(),
    notifySync(
      original.tenant,
      { userIds: original.users, event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ChatGroupDocument>,
          chats: [{ updateOne: { filter: { _id: chatId }, update: chatUpdate } }] satisfies BulkWrite<ChatDocument>,
        },
      },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:attachChatGroup()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Block a chatGroup chat content
 * (only admin or tenantAdmins could block content)
 */
const blockContent = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, chatId, contentId, remark } = await chatIdSchema
    .concat(contentIdSchema)
    .concat(removeSchema)
    .validate(args);

  const [original, chat, content] = await Promise.all([
    findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'ADMIN', { chats: chatId }),
    Chat.findOne({
      _id: chatId,
      parents: `/chatGroups/${id}`,
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

  const contentOwner = content ? await User.findOne({ _id: content.creator, ...activeCond }).lean() : null;

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const contentUpdate: UpdateQuery<ContentDocument> = {
    $addToSet: { flags: CONTENT.FLAG.BLOCKED },
    data: `${CONTENT_PREFIX.BLOCKED}#${Date.now()}###${userId}`,
  };
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      {
        updatedAt: new Date(),
        ...(remark && {
          $push: { remarks: { t: new Date(), u: userId, m: `blockContent (${chatId}-${contentId}): ${remark}` } },
        }),
      },
      { fields: select(), new: true },
    )
      .populate<Populate>(populate)
      .lean(), // indicating there is an update (in grandchild)
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    Content.updateOne({ _id: contentId }, contentUpdate),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, 'blockContent', { args, data: content.data }),
    notifySync(
      original.tenant || contentOwner?.tenants[0] || null, // satellite priority: chatGroup.tenant -> userPrimaryTenant (in case of adminMessage)
      { userIds: [userId, ...original.users], event: 'CHAT-GROUP' },
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

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:blockContent()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Create New Chat-Group
 *
 * note: case for messaging toAdmin or toAlex
 *  ! ONLY user.identifiedAt could create new chatGroup
 */

const create = async (req: Request, args: unknown, to?: To): Promise<ChatGroupDocumentEx> => {
  const { userId, userLocale, userName, userRoles, userTenants } = auth(req);

  // special case for sending message toAdmin, toAlex, toTenantAdmins, ...
  if (to) {
    let result: {
      chatGroup: ChatGroupDocument;
      chat: ChatDocument;
      content: ContentDocument;
      update: UpdateQuery<ChatGroupDocument>;
    };

    if (to === 'toAdmin') {
      if (config.mode === 'SATELLITE') throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

      const { content } = await contentSchema.validate(args);
      const title = {
        enUS: `Admin Message (${userName})`,
        zhCN: `管理员留言 (${userName})`,
        zhHK: `管理員留言 (${userName})`,
      };

      result = await messageToAdmins(content, userId, userLocale, isAdmin(userRoles), [], `USER#${userId}`, title);

      // messageToAdmins() only send notify(), need to sync manually here
      if (userTenants[0]) {
        const { chatGroup, chat, content, update } = result;
        await notifySync(mongoId(userTenants[0]), null, {
          bulkWrite: {
            chatGroups: [
              { updateOne: { filter: { _id: chatGroup._id }, update, upsert: true } },
            ] satisfies BulkWrite<ChatGroupDocument>,
            chats: [{ insertOne: { document: chat } }] satisfies BulkWrite<ChatDocument>,
          },
          contentsToken: await signContentIds(null, [content._id]),
        });
      }
    } else if (to === 'toAlex') {
      const [{ tenants }, { content }, { alexId }] = await Promise.all([
        authGetUser(req),
        contentSchema.validate(args),
        User.findSystemAccountIds(),
      ]);
      if (!alexId) throw { statusCode: 500, code: MSG_ENUM.SATELLITE_ERROR };
      result = await startChatGroup(tenants[0] || null, content, [userId, alexId], userLocale, `ALEX#USER#${userId}`); // allowing sync with primary tenant
    } else {
      const { content, tenantId } = await contentSchema.concat(tenantIdSchema).validate(args);
      if (!userTenants.includes(tenantId)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

      const tenant = await Tenant.findByTenantId(tenantId);
      const users =
        to === 'toTenantAdmins' ? tenant.admins : to === 'toTenantCounselors' ? tenant.counselors : tenant.supports;

      result = await startChatGroup(
        tenant._id,
        content,
        [userId, ...users],
        userLocale,
        `TENANT#${tenantId}-USER#${userId} (${to.replace('toTenant', '').toLowerCase()})`,
        `TENANT_${to.replace('toTenant', '').toUpperCase()}`,
      );
    }

    const populatedChatGroup = await ChatGroup.findById(result.chatGroup._id, select())
      .populate<Populate>(populate)
      .lean();
    if (populatedChatGroup) return transform(userId, populatedChatGroup);

    log('error', `chatGroupController:${to}`, args, userId);
    throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
  }

  // create a normal chatGroup
  const [user, { userIds, tenantId, membership, logoUrl, ...inputFields }] = await Promise.all([
    authCheckUserSuspension(req),
    chatGroupSchema.concat(tenantIdSchema).concat(userIdsSchema).validate(args),
  ]);

  const [users, tenant] = await Promise.all([
    User.find({ _id: { $in: [userId, ...userIds] }, tenants: tenantId }, '_id').lean(), // only allow users with tenantId
    Tenant.findByTenantId(tenantId),
    logoUrl && storage.validateObject(logoUrl, userId),
  ]);
  const allUserIds = users.map(u => u._id);

  if (
    !user.identifiedAt ||
    addYears(user.identifiedAt, DEFAULTS.USER.IDENTIFIABLE_EXPIRY) < new Date() || // only identifiable user could create chat
    !tenant.services.includes(TENANT.SERVICE.CHAT_GROUP)
  )
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  if (!userTenants.includes(tenantId)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
    ...inputFields,
    tenant: tenant._id,
    ...(logoUrl && { logoUrl }),
    membership: Object.keys(CHAT_GROUP.MEMBERSHIP).includes(membership) ? membership : CHAT_GROUP.MEMBERSHIP.NORMAL,
    admins: [user._id],
    users: allUserIds,
  });

  const [transformed] = await Promise.all([
    transform(userId, chatGroup.toObject()),
    ChatGroup.insertMany(chatGroup),
    notifySync(
      tenant._id,
      { userIds: [userId, ...allUserIds], event: 'CHAT-GROUP' },
      {
        bulkWrite: { chatGroups: [{ insertOne: { document: chatGroup } }] satisfies BulkWrite<ChatGroupDocument> },
        ...(logoUrl && { minio: { serverUrl: config.server.minio.serverUrl, addObjects: [logoUrl] } }),
      },
    ),
  ]);

  return transformed;
};

/**
 * Create New Chat-Group (RESTful)
 */
const createNew: RequestHandler<{ to?: To }> = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, req.body, req.params.to) });
  } catch (error) {
    next(error);
  }
};

// (helper) common code for find(), findMany(), findOne()
const findCommon = async (userId: Types.ObjectId, userTenants: string[], args: unknown, getOne = false) => {
  const { id, query } = getOne
    ? await idSchema.concat(querySchema).validate(args)
    : { ...(await querySchema.validate(args)), id: null };

  return searchFilter<ChatGroupDocument>(
    id ? [] : searchableFields,
    { query },
    {
      ...(id && { _id: id }),
      $or: [
        { users: userId },
        { marshals: userId },
        { tenant: { $in: userTenants }, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC },
      ],
    },
  );
};

/**
 * Find Multiple Chat-Groups (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx[]> => {
  const { userId, userTenants } = auth(req);
  const filter = await findCommon(userId, userTenants, args);

  const chatGroups = await ChatGroup.find(filter, select()).populate<Populate>(populate).lean();

  return Promise.all(chatGroups.map(async chatGroup => transform(userId, chatGroup)));
};

/**
 * Find Multiple Chat-Groups with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userTenants } = auth(req);
    const filter = await findCommon(userId, userTenants, { query: req.query });

    const options = paginateSort(req.query, { updatedAt: -1 });

    const [total, chatGroups] = await Promise.all([
      ChatGroup.countDocuments(filter),
      ChatGroup.find(filter, select(), options).populate<Populate>(populate).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: await Promise.all(chatGroups.map(async chatGroup => transform(userId, chatGroup))),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Chat-Group by ID
 */
const findOne = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx | null> => {
  const { userId, userTenants } = auth(req);
  const filter = await findCommon(userId, userTenants, args, true);

  const chatGroup = await ChatGroup.findOne(filter, select()).populate<Populate>(populate).lean();

  return chatGroup && transform(userId, chatGroup);
};

/**
 * Find One Chat-Group by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const chatGroup = await findOne(req, { id: req.params.id });
    chatGroup ? res.status(200).json({ data: chatGroup }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * join (me) to Chat-Group (if CHAT_GROUP.MEMBERSHIP.PUBLIC)
 */
const join = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);

  const update: UpdateQuery<ChatGroupDocument> = { $addToSet: { users: userId } };

  const chatGroup = await ChatGroup.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      membership: CHAT_GROUP.MEMBERSHIP.PUBLIC,
      users: { $ne: userId },
      key: { $exists: false },
      deletedAt: { $exists: false },
    },
    update,
    { fields: select(), new: true },
  )
    .populate<Populate>(populate)
    .lean();
  if (!chatGroup || !chatGroup.tenant) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [transformed] = await Promise.all([
    transform(userId, chatGroup),
    notifySync(
      chatGroup.tenant,
      { userIds: chatGroup.users, event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ChatGroupDocument>,
        },
      },
    ),
  ]);
  return transformed;
};

/**
 * join (me) to book ChatGroup
 */
const joinBook = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  hubModeOnly();

  const { userId, userExtra, userLocale, userName } = auth(req);
  const { id } = await idSchema.validate(args);

  const [original, isActiveTeacher, book, school] = await Promise.all([
    ChatGroup.findOne({ _id: id, flags: CHAT_GROUP.FLAG.BOOK, membership: CHAT_GROUP.MEMBERSHIP.CLOSED }).lean(),
    isTeacher(userExtra),
    Book.findOne({ chatGroup: id, deletedAt: { $exists: false } }).lean(),
    userExtra?.school && School.findOne({ _id: userExtra.school, deletedAt: { $exists: false } }).lean(),
  ]);

  if (!original || !isActiveTeacher || !book || !school)
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const msg = {
    enUS: `${userName} of ${school.name.enUS} (userId: ${userId}), Welcome to join book discussion group ${book.title} [[/books/${id}]].`,
    zhCN: `${school.name.zhCN || school.name.zhHK} ${userName}(userId: ${userId})，欢迎你加入讨论区 ${
      book.title
    } [[/books/${id}]]。`,
    zhHK: `${school.name.zhHK} ${userName} (userId: ${userId})，歡迎你加入討論區 ${book.title} [[/books/${id}]]。`,
  };

  const content = new Content<Partial<ContentDocument>>({ creator: userId, data: extract(msg, userLocale) });
  const chat = await Chat.create<Partial<ChatDocument>>({
    parents: [`/chatGroups/${id}`],
    contents: [content._id],
  }); // must create (save) chat before chatGroup populating
  content.parents = [`/chats/${chat._id}`];

  const update: UpdateQuery<ChatGroupDocument> = { $push: { chats: chat._id }, $addToSet: { users: userId } };
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, update, { fields: select(), new: true }).populate<Populate>(populate).lean(),
    Content.insertMany(content),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, 'joinBook', { args, bookId: book._id.toString() }),
    notifySync(
      null,
      { userIds: [...original.users, userId], event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ChatGroupDocument>,
          chats: [{ insertOne: { document: chat } }] satisfies BulkWrite<ChatDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:joinBook()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Leave Chat
 * not allow to leave adminChat & other chats with key (likely tenantAdmins, tenantSupports chats)
 */
const leave = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);

  const update: UpdateQuery<ChatGroupDocument> = { $pull: { users: userId, admins: userId } };
  const chatGroup = await ChatGroup.findOneAndUpdate(
    {
      _id: id,
      users: userId,
      flags: { $ne: CHAT_GROUP.FLAG.ADMIN },
      tenant: { $in: userTenants },
      key: { $exists: false },
      deletedAt: { $exists: false },
    },
    update,
    { fields: select(), new: true },
  )
    .populate<Populate>(populate)
    .lean();
  if (!chatGroup || !chatGroup.tenant) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await notifySync(
    chatGroup.tenant,
    { userIds: chatGroup.users, event: 'CHAT-GROUP' },
    {
      bulkWrite: {
        chatGroups: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ChatGroupDocument>,
      },
    },
  );
  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Recall a chatGroup chat content
 */
const recallContent = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, chatId, contentId } = await chatIdSchema.concat(contentIdSchema).concat(idSchema).validate(args);

  const [original, chat, content] = await Promise.all([
    findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'USER', { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
    Content.findOne({
      _id: contentId,
      parents: `/chats/${chatId}`,
      creator: userId,
      flags: { $nin: [CONTENT.FLAG.BLOCKED, CONTENT.FLAG.RECALLED] },
    }).lean(),
  ]);
  if (!chat || !content) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const contentUpdate: UpdateQuery<ContentDocument> = {
    $addToSet: { flags: CONTENT.FLAG.RECALLED },
    data: `${CONTENT_PREFIX.RECALLED}#${Date.now()}###${userId}`,
  };
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: select(), new: true })
      .populate<Populate>(populate)
      .lean(), // indicating there is an update (in grandchild)
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    Content.updateOne({ _id: contentId }, contentUpdate),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, 'recallContent', { args, data: content.data }),
    notifySync(
      userTenants[0] ? mongoId(userTenants[0]) : null, // satellite priority: chatGroup.tenant -> userPrimaryTenant (in case of adminMessage)
      { userIds: [userId, ...original.users], event: 'CHAT-GROUP' },
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

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:recallContent()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Share an question to this chatGroups
 */
const shareQuestion = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userLocale, userRoles, userTenants } = auth(req);
  const { id, sourceId: questionId } = await idSchema.concat(sourceIdSchema).validate(args);

  const [original, question] = await Promise.all([
    findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'ADMIN'),
    Question.findOne({
      _id: questionId,
      $or: [{ student: userId }, { tutor: userId }],
      deletedAt: { $exists: false },
    }).lean(),
  ]);
  if (!question || !original.tenant || !original.tenant.equals(question.tenant))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = { enUS: `Sharing Question`, zhCN: `分享提问`, zhHK: `分享提問` };
  const content = new Content<Partial<ContentDocument>>({ creator: userId, data: extract(msg, userLocale) });

  const chat = await Chat.create<Partial<ChatDocument>>({
    parents: [`/chatGroups/${id}`],
    contents: [content._id, ...question.contents],
  }); // must create & save chat before chatGroup populating
  content.parents = [`/chats/${chat._id}`];

  const update: UpdateQuery<ChatGroupDocument> = { $push: { chats: chat._id } };
  const contentUpdate: UpdateQuery<ContentDocument> = { $addToSet: { parents: `/chats/${chat._id}` } };
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, update, { fields: select(), new: true }).populate<Populate>(populate).lean(),
    Content.updateMany({ _id: { $in: question.contents } }, contentUpdate),
    Content.insertMany(content),
    notifySync(
      original.tenant,
      { userIds: original.users, event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ChatGroupDocument>,
          chats: [{ insertOne: { document: chat } }] satisfies BulkWrite<ChatDocument>,
          contents: [
            { updateMany: { filter: { _id: { $in: question.contents } }, update: contentUpdate } },
          ] satisfies BulkWrite<ContentDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:shareQuestion()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Chat-Group Title and/or Description
 */
const update = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, membership, logoUrl, ...inputFields } = await chatGroupSchema.concat(idSchema).validate(args);

  const original = await findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'ADMIN');
  if (original.key || !original.tenant || !Object.keys(CHAT_GROUP.MEMBERSHIP).includes(membership))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // promises below will throw error if fail
  await Promise.all([
    logoUrl && original.logoUrl !== logoUrl && storage.validateObject(logoUrl, userId), // only need to validate NEW logoUrl
    original.logoUrl && original.logoUrl !== logoUrl && storage.removeObject(original.logoUrl), // remove old logoUrl from minio if exists and is different from new logoUrl
  ]);

  const update: UpdateQuery<ChatGroupDocument> = {
    ...inputFields,
    membership,
    ...(logoUrl ? { logoUrl } : { $unset: { logoUrl: 1 } }),
  };
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, update, { fields: select(), new: true }).populate<Populate>(populate).lean(),
    notifySync(
      original.tenant,
      { userIds: original.users, event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ChatGroupDocument>,
        },
        minio: {
          serverUrl: config.server.minio.serverUrl,
          ...(logoUrl && original.logoUrl !== logoUrl && { addObjects: [logoUrl] }),
          ...(original.logoUrl && original.logoUrl !== logoUrl && { removeObjects: [original.logoUrl] }),
        },
      },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:update()', args, userId);
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
): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, chatId, flag } = await chatIdSchema.concat(flagSchema).concat(idSchema).validate(args);

  const [original, chat] = await Promise.all([
    findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'USER', { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
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

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: select(), new: true })
      .populate<Populate>(populate)
      .lean(),
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    notifySync(
      userTenants[0] ? mongoId(userTenants[0]) : null, // satellite priority: chatGroup.tenant -> userPrimaryTenant (in case of adminMessage)
      { userIds: [userId], event: 'CHAT-GROUP' },
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
  if (chatGroup) return transform(userId, chatGroup);
  log('error', `chatGroupController:${action}()`, args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update LastViewedAt
 */
const updateChatLastViewedAt = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const {
    id,
    chatId,
    timestamp = new Date(),
  } = await chatIdSchema.concat(idSchema).concat(optionalTimestampSchema).validate(args);

  const [original, chat] = await Promise.all([
    findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'USER', { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // must update chat before chatGroup populating
  await Chat.updateMany(
    { _id: chatId },
    chat.members.some(m => m.user.equals(userId))
      ? { members: chat.members.map(m => (m.user.equals(userId) ? { ...m, lastViewedAt: timestamp } : m)) }
      : { $push: { members: { user: userId, flags: [], lastViewedAt: timestamp } } },
  );

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: select(), new: true })
      .populate<Populate>(populate)
      .lean(),
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    notifySync(
      userTenants[0] ? mongoId(userTenants[0]) : null, // satellite priority: chatGroup.tenant -> userPrimaryTenant (in case of adminMessage)
      { userIds: [userId], event: 'CHAT-GROUP' },
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

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:updateChatLastViewedAt()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Chat Title
 */
const updateChatTitle = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, chatId, title } = await chatIdSchema.concat(idSchema).concat(optionalTitleSchema).validate(args);

  const [original, chat] = await Promise.all([
    findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'ADMIN', { chats: chatId }),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (original.key || !original.tenant || !chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const chatUpdate: UpdateQuery<ChatDocument> = title ? { title } : { $unset: { title: 1 } };
  await Chat.updateOne({ _id: chatId }, chatUpdate); // must update chat before chatGroup populating

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, { updatedAt: new Date() }, { fields: select(), new: true })
      .populate<Populate>(populate)
      .lean(), // indicating there is an update (in grandchild)
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, 'updateChatTitle', { args }),
    notifySync(
      original.tenant,
      { userIds: original.users, event: 'CHAT-GROUP' },
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
  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:blockContent()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * updateMembers
 *
 * note:
 *
 * 1) not allow to addUsers for admin messages & startChatGroup() messages (with key)
 * 2) only chatGroup.admins could addUsers() & promote chatGroup.users to admin
 * 3) for CLOSED-MEMBERSHIP, only chatGroup.admins could add users
 */
const updateMembers = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'updateAdmins' | 'updateUsers'>,
): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, userIds } = await idSchema.concat(userIdsSchema).validate(args);

  const original = await findOneChatGroup(id, userId, isAdmin(userRoles), userTenants, 'USER');
  if (original.key || !original.tenant) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const users = await User.find({ _id: { $in: [userId, ...userIds] }, tenants: original.tenant }, '_id').lean();
  const updatedUserIds = users.map(u => u._id);

  if (
    (action === 'updateUsers' &&
      !original.admins.some(a => a.equals(userId)) &&
      original.membership === CHAT_GROUP.MEMBERSHIP.CLOSED) ||
    (action === 'updateAdmins' && !original.admins.some(a => a.equals(userId)))
  )
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const update: UpdateQuery<ChatGroupDocument> =
    action === 'updateAdmins'
      ? { admins: updatedUserIds.filter(u => original.users.some(user => user.equals(u))) } //(promote users to admins) newAdmins must be chatGroup.users already
      : { users: updatedUserIds };

  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, update, { fields: select(), new: true }).populate<Populate>(populate).lean(),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, action, {
      args,
      original: action === 'updateAdmins' ? original.admins : original.users,
    }),
    notifySync(
      original.tenant,
      { userIds: [...original.users, ...updatedUserIds], event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<ChatGroupDocument>,
        },
      },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:updateMembers()', args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Chat-Group (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, ...req.body }) });
      case 'attachChatGroup':
        return res.status(200).json({ data: await attachChatGroup(req, { id, ...req.body }) });
      case 'addContent':
        return res.status(200).json({ data: await addContent(req, { id, ...req.body }) });
      case 'addContentWithNewChat':
        return res.status(200).json({ data: await addContentWithNewChat(req, { id, ...req.body }) });
      case 'blockContent':
        return res.status(200).json({ data: await blockContent(req, { id, ...req.body }) });
      case 'clearChatFlag':
        return res.status(200).json({ data: await updateChatFlag(req, { id, ...req.body }, action) });
      case 'join':
        return res.status(200).json({ data: await join(req, { id }) });
      case 'joinBook':
        return res.status(200).json({ data: await joinBook(req, { id }) });
      case 'leave':
        return res.status(200).json(await leave(req, { id }));
      case 'recallContent':
        return res.status(200).json({ data: await recallContent(req, { id, ...req.body }) });
      case 'setChatFlag':
        return res.status(200).json({ data: await updateChatFlag(req, { id, ...req.body }, action) });
      case 'shareQuestion':
        return res.status(200).json({ data: await shareQuestion(req, { id, ...req.body }) });
      case 'updateAdmins':
        return res.status(200).json({ data: await updateMembers(req, { id, ...req.body }, action) });
      case 'updateChatTitle':
        return res.status(200).json({ data: await updateChatTitle(req, { id, ...req.body }) });
      case 'updateChatLastViewedAt':
        return res.status(200).json({ data: await updateChatLastViewedAt(req, { id, ...req.body }) });
      case 'updateUsers':
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
  attachChatGroup,
  blockContent,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  join,
  joinBook,
  leave,
  recallContent,
  shareQuestion,
  update,
  updateById,
  updateChatFlag,
  updateChatLastViewedAt,
  updateChatTitle,
  updateMembers,
};
