/**
 * Controller: ChatGroups
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import { addYears } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import Book from '../models/book';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import type { ChatGroupDocument, Id } from '../models/chat-group';
import ChatGroup, { searchableFields } from '../models/chat-group';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import DatabaseEvent from '../models/event/database';
import Question from '../models/question';
import School from '../models/school';
import Tenant from '../models/tenant';
import User from '../models/user';
import { extract, messageToAdmin, startChatGroup } from '../utils/chat';
import { idsToString, uniqueIds } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';
import { signContentIds } from './content';

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
type ChatGroupDocumentEx = ChatGroupDocument & Id & { contentsToken: string };

const { MSG_ENUM } = LOCALE;
const { CONTENT, CHAT, CHAT_GROUP, TENANT } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const {
  assertUnreachable,
  auth,
  authCheckUserSuspension,
  censorContent,
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

/**
 * (helper) findOne active chatGroup ADMIN (chatGroup.admin, tenantAdmin, or isAdmin)
 */
const findOneChatGroup = async (
  id: string,
  userId: string,
  userRoles: string[],
  userTenants: string[],
  type: 'ADMIN' | 'USER',
) => {
  const chatGroup = await ChatGroup.findOne({
    _id: id,
    tenant: { $in: [...userTenants, undefined] }, // accessible only $in userTenants or undefined (message to Alex)
    deletedAt: { $exists: false },
  }).lean();

  if (
    chatGroup &&
    ((type === 'USER' &&
      (idsToString(chatGroup.users).includes(userId) || idsToString(chatGroup.marshals).includes(userId))) ||
      (type === 'ADMIN' && idsToString(chatGroup.admins).includes(userId)) ||
      (!chatGroup.tenant && isAdmin(userRoles)) ||
      (chatGroup.tenant && (await Tenant.findByTenantId(chatGroup.tenant, userId))))
  )
    return chatGroup;

  throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
};

/**
 * (helper) get parentId from chat.parents
 */
const otherParentIds = (chat: ChatDocument & Id, chatGroupId: string | Types.ObjectId) => {
  const classroomIds = chat.parents.filter(p => p.startsWith('/classrooms')).map(p => p.replace('/classrooms/', ''));
  const chatGroupIds = chat.parents.filter(p => p.startsWith('/chatGroups')).map(p => p.replace('/chatGroups/', ''));
  const otherChatGroupIds = chatGroupIds.filter(id => id !== chatGroupId.toString());

  return { chatGroupIds, classroomIds, otherChatGroupIds };
};

/**
 * (helper) generate contentsToken
 */
const transform = async (userId: string, chatGroup: ChatGroupDocument & Id): Promise<ChatGroupDocumentEx> => ({
  ...chatGroup,
  contentsToken: await signContentIds(
    userId,
    chatGroup.chats
      .map(chat =>
        typeof chat === 'string' || chat instanceof mongoose.Types.ObjectId ? 'ERROR' : idsToString(chat.contents),
      )
      .flat(),
  ),
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
    findOneChatGroup(id, userId, userRoles, userTenants, 'USER'),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!idsToString(original.chats).includes(chatId) || !chat)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chatId}`],
    creator: userId,
    data,
    visibleAfter,
  });
  const [sysIds] = await Promise.all([
    !original.tenant && User.findSystemAccountIds(),
    Chat.updateOne(
      { _id: chat },
      {
        members: chat.members.map(m => (m.user.toString() === userId ? { ...m, lastViewedAt: new Date() } : m)),
        $push: { contents: content },
      },
    ), // must update chat before chatGroup populating
  ]);

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { updatedAt: new Date(), ...(sysIds && { $addToSet: { admins: { $each: sysIds.adminIds } } }) }, // $addToSet system admins if need
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    content.save(),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: original.users },
      { chatGroupIds, classroomIds, chatIds: [chatId], contentIds: [content] },
    ),
    original.tenant && censorContent(original.tenant, userId, userLocale, 'chat-groups', id, content),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:addContent()', { id, chatId, visibleAfter }, userId);
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

  const original = await findOneChatGroup(id, userId, userRoles, userTenants, 'USER');
  const content = new Content<Partial<ContentDocument>>({ creator: userId, data, visibleAfter });
  const chat = new Chat<Partial<ChatDocument>>({
    parents: [`/chatGroups/${id}`],
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    contents: [content._id],
    ...(title && { title }),
  });
  content.parents = [`/chats/${chat._id}`];

  // if chatGroup has no tenantId, it is admin chatGroup, $addToSet adminId
  const [sysIds] = await Promise.all([!original.tenant && User.findSystemAccountIds(), chat.save()]); // must save chat before chatGroup populating

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { $push: { chats: chat }, ...(sysIds && { $addToSet: { admins: { $each: sysIds.adminIds } } }) }, // $addToSet system admins
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    content.save(),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: original.users },
      { chatGroupIds, classroomIds, chatIds: [chat], contentIds: [content] },
    ),
    original.tenant && censorContent(original.tenant, userId, userLocale, 'chat-groups', id, content),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:addContentWithNewChat()', { id, title, visibleAfter }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Attach a chat (from another chatGroup) to this chatGroup (within the same tenantId)
 */
const attachChatGroup = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, chatId, sourceId } = await chatIdSchema.concat(idSchema).concat(sourceIdSchema).validate(args);

  const [original, validChat, source] = await Promise.all([
    findOneChatGroup(id, userId, userRoles, userTenants, 'ADMIN'),
    Chat.exists({ _id: chatId, parents: `/chatGroups/${sourceId}`, deletedAt: { $exists: false } }),
    findOneChatGroup(sourceId, userId, userRoles, userTenants, 'ADMIN'),
  ]);

  if (
    !validChat ||
    idsToString(original.chats).includes(chatId) ||
    !idsToString(source.chats).includes(chatId) ||
    original.tenant?.toString() !== source.tenant?.toString()
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Chat.updateMany({ _id: chatId }, { $addToSet: { parents: `/chatGroups/${id}` } }); // must update chats before chatGroup populating
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { $push: { chats: chatId } },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: original.users },
      { chatGroupIds: [id], chatIds: [chatId] },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:attachChatGroup()', { id }, userId);
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
    findOneChatGroup(id, userId, userRoles, userTenants, 'ADMIN'),
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
  if (!idsToString(original.chats).includes(chatId) || !chat || !content)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { updatedAt: new Date() },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(), // indicating there is an update (in grandchild)
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    Content.updateOne(
      { _id: contentId },
      { $addToSet: { flags: CONTENT.FLAG.BLOCKED }, data: `${CONTENT_PREFIX.BLOCKED}#${Date.now()}###${userId}` },
    ),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, 'blockContent', { chatId, contentId, remark, data: content.data }),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: [userId, ...original.users] },
      { chatGroupIds, classroomIds, contentIds: [contentId] },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:blockContent()', { id, chatId, contentId, remark }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Create New Chat-Group
 *
 * note: case for messaging toAdmin or toAlex
 *  ! messageToAdmin() & startChatGroup() notifySync chatGroupId, chatId & contentId
 *  ! ONLY user.identifiedAt could create new chatGroup
 */

const create = async (req: Request, args: unknown, to?: To): Promise<ChatGroupDocumentEx> => {
  const { userId, userLocale, userName, userRoles, userTenants } = auth(req);

  // special case for sending message toAdmin, toAlex, toTenantAdmins, ...
  if (to) {
    let chatGroup: ChatGroupDocument & Id;

    if (to === 'toAdmin') {
      const { content } = await contentSchema.validate(args);
      chatGroup = await messageToAdmin(content, userId, userLocale, userRoles, [], `USER#${userId}`, userName);
    } else if (to === 'toAlex') {
      const [{ content }, { alexId }] = await Promise.all([contentSchema.validate(args), User.findSystemAccountIds()]);
      chatGroup = await startChatGroup(null, content, [userId, alexId], userLocale, `ALEX#USER#${userId}`);
    } else {
      const { content, tenantId } = await contentSchema.concat(tenantIdSchema).validate(args);
      const tenant = await Tenant.findByTenantId(tenantId);
      const users =
        to === 'toTenantAdmins' ? tenant.admins : to === 'toTenantCounselors' ? tenant.counselors : tenant.supports;
      chatGroup = await startChatGroup(
        tenantId,
        content,
        [userId, ...users],
        userLocale,
        `TENANT#${tenantId}-USER#${userId} (${to.replace('toTenant', '').toLowerCase()})`,
      );
    }

    return transform(userId, chatGroup);
  }

  // create a normal chatGroup
  const [{ identifiedAt }, { userIds, tenantId, membership, logoUrl, ...fields }] = await Promise.all([
    authCheckUserSuspension(req),
    chatGroupSchema.concat(tenantIdSchema).concat(userIdsSchema).validate(args),
  ]);

  if (!identifiedAt || addYears(identifiedAt, DEFAULTS.USER.IDENTIFIABLE_EXPIRY) < new Date())
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION }; // only identifiable user could create chat

  const [users, tenant] = await Promise.all([
    User.find({ _id: { $in: userIds }, tenants: tenantId }).lean(), // only allow users with tenantId
    Tenant.findByTenantId(tenantId),
    logoUrl && storage.validateObject(logoUrl, userId),
  ]);

  if (!tenant.services.includes(TENANT.SERVICE.CHAT_GROUP))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  if (!userTenants.includes(tenantId) || users.length !== userIds.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const chatGroup = new ChatGroup<Partial<ChatGroupDocument & Id>>({
    ...fields,
    tenant: tenantId,
    ...(logoUrl && { logoUrl }),
    membership: Object.keys(CHAT_GROUP.MEMBERSHIP).includes(membership) ? membership : CHAT_GROUP.MEMBERSHIP.NORMAL,
    admins: [userId],
    users: uniqueIds([userId, ...userIds]),
  });

  const [transformed] = await Promise.all([
    transform(userId, chatGroup.toObject()),
    chatGroup.save(),
    notifySync(
      'CHAT-GROUP',
      { tenantId, userIds: [userId, ...userIds] },
      { chatGroupIds: [chatGroup], ...(logoUrl && { minioAddItems: [logoUrl] }) },
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
const findCommon = async (userId: string, userTenants: string[], args: unknown, getOne = false) => {
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

  const chatGroups = await ChatGroup.find(filter, select())
    .populate([{ path: 'chats', select: select() }])
    .lean();

  return Promise.all(chatGroups.map(async chatGroup => transform(userId, chatGroup)));
};

/**
 * Find Multiple Chat-Groups with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userTenants } = auth(req);
    const filter = await findCommon(userId, userTenants, { query: req.query });

    const options = paginateSort(req.query, { updatedAt: 1 });

    const [total, chatGroups] = await Promise.all([
      ChatGroup.countDocuments(filter),
      ChatGroup.find(filter, select(), options)
        .populate([{ path: 'chats', select: select() }])
        .lean(),
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

  const chatGroup = await ChatGroup.findOne(filter, select())
    .populate([{ path: 'chats', select: select() }])
    .lean();

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

  const chatGroup = await ChatGroup.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      membership: CHAT_GROUP.MEMBERSHIP.PUBLIC,
      users: { $ne: userId },
      key: { $exists: false },
      deletedAt: { $exists: false },
    },
    { $addToSet: { users: userId } },
    { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
  ).lean();
  if (!chatGroup) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [transformed] = await Promise.all([
    transform(userId, chatGroup),
    notifySync('CHAT-GROUP', { tenantId: chatGroup.tenant, userIds: chatGroup.users }, { chatGroupIds: [id] }),
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

  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { $push: { chats: chat._id }, $addToSet: { users: userId } },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    content.save(),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, 'joinBook', { id, bookId: book._id.toString() }),
    notifySync(
      'CHAT-GROUP',
      { userIds: [...original.users, userId] },
      { chatGroupIds: [id], chatIds: [chat], contentIds: [content] },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:joinBook()', { id }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Leave Chat
 */
const leave = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);
  const chatGroup = await ChatGroup.findOneAndUpdate(
    {
      _id: id,
      users: userId,
      flags: { $ne: CHAT_GROUP.FLAG.ADMIN },
      tenant: { $in: userTenants },
      key: { $exists: false },
      deletedAt: { $exists: false },
    },
    { $pull: { users: userId, admins: userId } },
    { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
  ).lean();
  if (!chatGroup) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await notifySync('CHAT-GROUP', { tenantId: chatGroup.tenant, userIds: chatGroup.users }, { chatGroupIds: [id] });
  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Recall a chatGroup chat content
 */
const recallContent = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, chatId, contentId } = await chatIdSchema.concat(contentIdSchema).concat(idSchema).validate(args);

  const [original, chat, content] = await Promise.all([
    findOneChatGroup(id, userId, userRoles, userTenants, 'USER'),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
    Content.findOne({
      _id: contentId,
      parents: `/chats/${chatId}`,
      creator: userId,
      flags: { $nin: [CONTENT.FLAG.BLOCKED, CONTENT.FLAG.RECALLED] },
    }).lean(),
  ]);
  if (!idsToString(original.chats).includes(chatId) || !chat || !content)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { updatedAt: new Date() },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(), // indicating there is an update (in grandchild)
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    Content.updateOne(
      { _id: contentId },
      { $addToSet: { flags: CONTENT.FLAG.RECALLED }, data: `${CONTENT_PREFIX.RECALLED}#${Date.now()}###${userId}` },
    ),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, 'recallContent', { chatId, contentId, data: content.data }),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: original.users },
      { chatGroupIds, classroomIds, contentIds: [contentId] },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:recallContent()', { id, chatId, contentId }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Share an question to this chatGroups
 */
const shareQuestion = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userLocale, userRoles, userTenants } = auth(req);
  const { id, sourceId: questionId } = await idSchema.concat(sourceIdSchema).validate(args);

  const [original, question] = await Promise.all([
    findOneChatGroup(id, userId, userRoles, userTenants, 'ADMIN'),
    Question.findOne({
      _id: questionId,
      $or: [{ student: userId }, { tutor: userId }],
      deletedAt: { $exists: false },
    }).lean(),
  ]);
  if (!question || !original.tenant || original.tenant.toString() !== question.tenant.toString())
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const msg = { enUS: `Sharing Homework`, zhCN: `分享功課`, zhHK: `分享功課` };
  const content = new Content<Partial<ContentDocument>>({ creator: userId, data: extract(msg, userLocale) });

  const chat = await Chat.create<Partial<ChatDocument & Id>>({
    parents: [`/chatGroups/${id}`],
    contents: [content._id, ...idsToString(question.contents)],
  }); // must create & save chat before chatGroup populating
  content.parents = [`/chats/${chat._id}`];

  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { $push: { chats: chat } },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    content.save(),
    Content.updateMany({ _id: { $in: question.contents } }, { $addToSet: { parents: `/chats/${chat._id}` } }),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: original.users },
      { chatGroupIds: [id], chatIds: [chat], contentIds: chat.contents },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:shareQuestion()', { id, questionId }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Chat-Group Title and/or Description
 */
const update = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, membership, logoUrl, ...fields } = await chatGroupSchema.concat(idSchema).validate(args);

  const original = await findOneChatGroup(id, userId, userRoles, userTenants, 'ADMIN');
  if (original.key) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // promises below will throw error if fail
  await Promise.all([
    logoUrl && original.logoUrl !== logoUrl && storage.validateObject(logoUrl, userId), // only need to validate NEW logoUrl
    original.logoUrl && original.logoUrl !== logoUrl && storage.removeObject(original.logoUrl), // remove old logoUrl from minio if exists and is different from new logoUrl
  ]);

  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      {
        ...fields,
        membership: Object.keys(CHAT_GROUP.MEMBERSHIP).includes(membership) ? membership : CHAT_GROUP.MEMBERSHIP.NORMAL,
        ...(logoUrl ? { logoUrl } : { $unset: { logoUrl: 1 } }),
      },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: original.users },
      {
        chatGroupIds: [id],
        ...(logoUrl && original.logoUrl !== logoUrl && { minioAddItems: [logoUrl] }),
        ...(original.logoUrl && original.logoUrl !== logoUrl && { minioRemoveItems: [original.logoUrl] }),
      },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:update()', { chatGroupId: id, membership, logoUrl, ...fields }, userId);
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
    findOneChatGroup(id, userId, userRoles, userTenants, 'USER'),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!Object.keys(CHAT.MEMBER.FLAG).includes(flag) || !idsToString(original.chats).includes(chatId) || !chat)
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

  if (updateMembers) await Chat.updateOne({ _id: chat }, { members: updateMembers }); // update chat if any changes

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { updatedAt: new Date() },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    updateMembers &&
      notifySync(
        'CHAT-GROUP',
        { tenantId: original.tenant, userIds: [userId] },
        { chatGroupIds, classroomIds, chatIds: [chatId] },
      ),
  ]);
  if (chatGroup) return transform(userId, chatGroup);
  log('error', `chatGroupController:${action}()`, { id, chatId, flag }, userId);
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
    findOneChatGroup(id, userId, userRoles, userTenants, 'USER'),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (!idsToString(original.chats).includes(chatId) || !chat)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // must update chat before chatGroup populating
  await Chat.updateOne(
    { _id: chat },
    chat.members.find(m => m.user.toString() === userId)
      ? { members: chat.members.map(m => (m.user.toString() === userId ? { ...m, lastViewedAt: timestamp } : m)) }
      : { members: [...chat.members, { user: userId, flags: [], lastViewedAt: timestamp }] },
  );

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { updatedAt: new Date() },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: original.users },
      { chatGroupIds, classroomIds, chatIds: [chatId] },
    ),
  ]);
  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:updateChatLastViewedAt()', { id, chatId, timestamp }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Chat Title
 */
const updateChatTitle = async (req: Request, args: unknown): Promise<ChatGroupDocumentEx> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id, chatId, title } = await chatIdSchema.concat(idSchema).concat(optionalTitleSchema).validate(args);

  const [original, chat] = await Promise.all([
    findOneChatGroup(id, userId, userRoles, userTenants, 'ADMIN'),
    Chat.findOne({ _id: chatId, parents: `/chatGroups/${id}`, deletedAt: { $exists: false } }).lean(),
  ]);
  if (original.key || !idsToString(original.chats).includes(chatId) || !chat)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Chat.updateOne({ _id: chat }, title ? { title } : { $unset: { title: 1 } }); // must update chat before chatGroup populating

  const { chatGroupIds, otherChatGroupIds, classroomIds } = otherParentIds(chat, original._id);
  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      id,
      { updatedAt: new Date() },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(), // indicating there is an update (in grandchild)
    otherChatGroupIds.length && ChatGroup.updateMany({ _id: { $in: otherChatGroupIds } }, { updatedAt: new Date() }),
    classroomIds.length && Classroom.updateMany({ _id: { $in: classroomIds } }, { updatedAt: new Date() }),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, 'updateChatTitle', { chatId, title }),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: original.users },
      { chatGroupIds, classroomIds, chatIds: [chatId] },
    ),
  ]);
  if (chatGroup) return transform(userId, chatGroup);
  log('error', 'chatGroupController:blockContent()', { id, chatId, title }, userId);
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

  const original = await findOneChatGroup(id, userId, userRoles, userTenants, 'USER');
  if (original.key) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const users = await User.find({ _id: { $in: userIds }, tenants: original.tenant }, '_id').lean();
  if (users.length !== userIds.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  if (
    (action === 'updateUsers' &&
      !idsToString(original.admins).includes(userId) &&
      original.membership === CHAT_GROUP.MEMBERSHIP.CLOSED) ||
    (action === 'updateAdmins' && !idsToString(original.admins).includes(userId))
  )
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      original,
      action === 'updateAdmins'
        ? {
            admins: uniqueIds([userId, ...userIds]).filter(x => idsToString(original.users).includes(x)),
          } //(promote users to admins) newAdmins must be chatGroup.users already, but not chatGroup.admin
        : { users: uniqueIds([userId, ...userIds]) },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    DatabaseEvent.log(userId, `/chatGroups/${id}`, action, {
      id,
      userIds,
      original: action === 'updateAdmins' ? original.admins : original.users,
    }),
    notifySync(
      'CHAT-GROUP',
      { tenantId: original.tenant, userIds: [...original.users, ...userIds] },
      { chatGroupIds: [id] },
    ),
  ]);

  if (chatGroup) return transform(userId, chatGroup);
  throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
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
