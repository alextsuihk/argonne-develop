/**
 * Controller: ChatGroups
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addYears } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import Chat from '../models/chat';
import type { ChatGroupDocument } from '../models/chat-group';
import ChatGroup, { searchableFields } from '../models/chat-group';
import Tenant from '../models/tenant';
import User from '../models/user';
import { messageToAdmin, startChatGroup } from '../utils/chat';
import { idsToString } from '../utils/helper';
import { notify } from '../utils/messaging';
import storage from '../utils/storage';
import syncSatellite from '../utils/sync-satellite';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addAdmins' | 'addUsers' | 'join' | 'leave' | 'removeUsers';
type To = 'toAdmin' | 'toAlex' | 'toTenantAdmins';

const { MSG_ENUM } = LOCALE;
const { CHAT, CHAT_GROUP, TENANT } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const { assertUnreachable, auth, authGetUser, isAdmin, paginateSort, searchFilter, select } = common;
const { idSchema, querySchema, chatGroupSchema, contentSchema, tenantIdSchema, userIdsSchema } = yupSchema;

/**
 * addMembers (addAdmins or addUsers)
 *
 * note:
 *
 * 1) not allow to addUsers for admin messages (with adminKey) & startChatGroup() messages (with key)
 * 2) only chatGroup.admins could addUsers() & promote chatGroup.users to admin
 * 3) for CLOSED-MEMBERSHIP, only chatGroup.admins could add users
 */
const addMembers = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'addAdmins' | 'addUsers'>,
): Promise<LeanDocument<ChatGroupDocument>> => {
  const { userId, userTenants } = auth(req);
  const { id, userIds } = await idSchema.concat(userIdsSchema).validate(args);
  const uniqueUserIds = Array.from(new Set(userIds)); // remove duplicated userIds,

  const original = await ChatGroup.findOne({
    _id: id,
    tenant: { $in: userTenants },
    users: userId,
    adminKey: { $exists: false },
    key: { $exists: false },
  }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  if (
    (action === 'addUsers' &&
      !idsToString(original.admins).includes(userId) &&
      original.membership === CHAT_GROUP.MEMBERSHIP.CLOSED) ||
    (action === 'addAdmins' && !idsToString(original.admins).includes(userId))
  )
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const userCount = await User.countDocuments({ _id: { $in: uniqueUserIds }, tenants: original.tenant });
  if (userCount !== userIds.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // (promote users to admins) newAdmins must be chatGroup.users already, but not chatGroup.admin
  const newAdmins = uniqueUserIds
    .filter(x => !idsToString(original.admins).includes(x))
    .filter(x => idsToString(original.users).includes(x));

  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      original,
      { $addToSet: action === 'addUsers' ? { users: { $each: uniqueUserIds } } : { admins: { $each: newAdmins } } },
      { fields: select(), new: true },
    ).lean(),
    // undo (pull) 'REMOVED' from members.flags whom previously removed
    Chat.updateMany(
      { _id: { $in: original.chats }, 'members.user': { $in: uniqueUserIds } },
      { $pull: { 'members.$[elem].flags': CHAT.MEMBER.FLAG.REMOVED } },
      { arrayFilters: [{ 'elem.user': { $in: uniqueUserIds } }], multi: true },
    ),
    // add newMembers into chat.members
    Chat.updateMany(
      { _id: { $in: original.chats }, 'members.user': { $nin: uniqueUserIds } },
      { $addToSet: { members: { $each: uniqueUserIds.map(user => ({ user, flags: [] })) } } },
    ),
    notify([...original.users, ...uniqueUserIds], 'CHAT-GROUP', { chatGroupIds: [id] }),
    syncSatellite(
      { tenantId: original.tenant, userIds: [...original.users, ...uniqueUserIds] },
      { chatGroupIds: [id] },
    ),
  ]);

  return chatGroup!;
};

/**
 * Create New Chat-Group
 *
 * note: case for messaging toAdmin or toAlex
 *  - messageToAdmin() also notify()& syncSatellite()
 */

const create = async (req: Request, args: unknown, to?: To): Promise<LeanDocument<ChatGroupDocument>> => {
  const { userId, userLocale, userName, userRoles, userTenants } = auth(req);

  // special case for sending message toAdmin or toAlex
  if (to) {
    // const { content } = await contentSchema.validate(args);

    if (to === 'toAdmin') {
      const { content } = await contentSchema.validate(args);
      return messageToAdmin(content, userId, userLocale, userRoles, [], `USER#${userId}`, userName);
    }

    if (to === 'toAlex') {
      const [{ content }, { alexId }] = await Promise.all([contentSchema.validate(args), User.findSystemAccountIds()]);
      return startChatGroup(null, content, [userId, alexId], userLocale, `ALEX#USER#${userId}`);
    }

    if (to === 'toTenantAdmins') {
      const { content, tenantId } = await contentSchema.concat(tenantIdSchema).validate(args);
      const tenant = await Tenant.findByTenantId(tenantId);

      return startChatGroup(null, content, [userId, ...tenant.admins], userLocale, `TENANT#${tenantId}-USER#${userId}`);
    }

    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  }

  const [{ identifiedAt }, { userIds, tenantId, membership, logoUrl, ...fields }] = await Promise.all([
    authGetUser(req),
    chatGroupSchema.concat(tenantIdSchema).concat(userIdsSchema).validate(args),
  ]);

  // create a normal chatGroup
  if (!identifiedAt || addYears(identifiedAt, DEFAULTS.USER.IDENTIFIABLE_EXPIRY) < new Date())
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION }; // only identifiable user could create chat

  const [count, tenant] = await Promise.all([
    User.countDocuments({ _id: { $in: userIds }, tenants: tenantId }), // all users MUST be in the same tenant
    Tenant.findByTenantId(tenantId),
    logoUrl && storage.validateObject(logoUrl, userId),
  ]);

  if (!userTenants.includes(tenantId) || !tenant.services.includes(TENANT.SERVICE.CHAT_GROUP))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  if (count !== userIds.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const users = Array.from(new Set(idsToString([userId, ...userIds]))); // unique users
  const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
    ...fields,
    tenant: tenantId,
    ...(logoUrl && { logoUrl }),
    membership: Object.keys(CHAT_GROUP.MEMBERSHIP).includes(membership) ? membership : CHAT_GROUP.MEMBERSHIP.NORMAL,
    admins: [userId],
    users,
  });

  await Promise.all([
    chatGroup.save(),
    notify(users, 'CHAT-GROUP', { chatGroupIds: [chatGroup._id.toString()] }),
    syncSatellite(
      { tenantId, userIds: users },
      { chatGroupIds: [chatGroup._id.toString()], ...(logoUrl && { minioAddItems: [logoUrl] }) },
    ),
  ]);

  return chatGroup;
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

/**
 * Find Multiple Chat-Groups (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<ChatGroupDocument>[]> => {
  const { userId, userRoles } = auth(req);
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<ChatGroupDocument>(
    searchableFields,
    { query },
    isAdmin(userRoles) ? { $or: [{ users: userId }, { adminKey: { $exists: true } }] } : { users: userId },
  );

  return ChatGroup.find(filter, select()).lean();
};

/**
 * Find Multiple Chat-Groups with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userRoles } = auth(req);
    const { query } = await querySchema.validate({ query: req.query });

    const options = paginateSort(req.query, { updatedAt: 1 });
    const filter = searchFilter<ChatGroupDocument>(
      searchableFields,
      { query },
      isAdmin(userRoles) ? { $or: [{ users: userId }, { adminKey: { $exists: true } }] } : { users: userId },
    );

    const [total, chatGroups] = await Promise.all([
      ChatGroup.countDocuments(filter),
      ChatGroup.find(filter, select(), options).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: chatGroups });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Chat-Group by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<ChatGroupDocument> | null> => {
  const { userId, userRoles } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<ChatGroupDocument>(
    [],
    { query },
    isAdmin(userRoles)
      ? { _id: id, $or: [{ users: userId }, { adminKey: { $exists: true } }] }
      : { _id: id, users: userId },
  );
  return ChatGroup.findOne(filter, select()).lean();
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
 * join (me) toChat-Group (if CHAT_GROUP.MEMBERSHIP.PUBLIC)
 */
const join = async (req: Request, args: unknown): Promise<LeanDocument<ChatGroupDocument>> => {
  const { userId, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);

  const chatGroup = await ChatGroup.findOneAndUpdate(
    {
      _id: id,
      tenant: { $in: userTenants },
      membership: CHAT_GROUP.MEMBERSHIP.PUBLIC,
      users: { $ne: userId },
      adminKey: { $exists: false },
      key: { $exists: false },
    },
    { $push: { users: userId } },
    { fields: select(), new: true },
  ).lean();
  if (!chatGroup) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    Chat.updateMany(
      { _id: { $in: chatGroup.chats }, 'members.user': { $ne: userId } },
      { $push: { members: { user: userId, flags: [] } } },
    ),
    notify(chatGroup.users, 'CHAT-GROUP', { chatGroupIds: [id] }),
    syncSatellite({ tenantId: chatGroup.tenant, userIds: chatGroup.users }, { chatGroupIds: [id] }),
  ]);

  return chatGroup;
};

/**
 * Leave Chat
 */
const leave = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);
  const chatGroup = await ChatGroup.findOneAndUpdate(
    { _id: id, tenant: { $in: userTenants }, adminKey: { $exists: false }, key: { $exists: false } },
    { $pull: { users: userId, admins: userId } },
  ).lean();
  if (!chatGroup) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    Chat.updateMany(
      { _id: { $in: chatGroup.chats }, 'members.user': userId },
      { $push: { 'members.$.flags': CHAT.MEMBER.FLAG.REMOVED } },
    ),
    notify(chatGroup.users, 'CHAT-GROUP', { chatGroupIds: [id] }),
    syncSatellite({ tenantId: chatGroup.tenant, userIds: chatGroup.users }, { chatGroupIds: [id] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * removeUsers (by chatGroup.admins only)
 *
 */
const removeUsers = async (req: Request, args: unknown): Promise<LeanDocument<ChatGroupDocument>> => {
  const { userId, userTenants } = auth(req);
  const { id, userIds } = await idSchema.concat(userIdsSchema).validate(args);

  const chatGroup = await ChatGroup.findOne({
    _id: id,
    tenant: { $in: userTenants },
    admins: userId,
    adminKey: { $exists: false },
    key: { $exists: false },
  }).lean();
  if (!chatGroup) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [updatedChatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      chatGroup,
      { $pull: { users: { $in: userIds }, admins: { $in: userIds } } },
      { fields: select(), new: true },
    ).lean(),
    Chat.updateMany(
      { _id: { $in: chatGroup.chats }, 'members.user': { $in: userIds } },
      { $push: { 'members.$[elem].flags': CHAT.MEMBER.FLAG.REMOVED } },
      { arrayFilters: [{ 'elem.user': { $in: userIds } }], multi: true },
    ),
    notify(chatGroup.users, 'CHAT-GROUP', { chatGroupIds: [id] }),
    syncSatellite({ tenantId: chatGroup.tenant, userIds: chatGroup.users }, { chatGroupIds: [id] }),
  ]);

  return updatedChatGroup!;
};

/**
 * Update Chat-Group Title and/or Description
 */
const update = async (req: Request, args: unknown): Promise<LeanDocument<ChatGroupDocument>> => {
  const { userId, userTenants } = auth(req);
  const { id, description, title, membership, logoUrl } = await chatGroupSchema.concat(idSchema).validate(args);

  const original = await ChatGroup.findOne({
    _id: id,
    tenant: { $in: userTenants },
    admins: userId,
    adminKey: { $exists: false },
    key: { $exists: false },
  }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    logoUrl && original.logoUrl !== logoUrl && storage.validateObject(logoUrl, userId), // only need to validate NEW logoUrl
    original.logoUrl && original.logoUrl !== logoUrl && storage.removeObject(original.logoUrl), // remove old logoUrl from minio if exists and is different from new logoUrl
  ]);

  const update = {
    ...(title && { title }),
    ...(description && { description }),
    membership: Object.keys(CHAT_GROUP.MEMBERSHIP).includes(membership) ? membership : CHAT_GROUP.MEMBERSHIP.NORMAL,
    ...(logoUrl ? { logoUrl } : { $unset: { logoUrl: 1 } }),
  };

  const [chatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(id, update, { fields: select(), new: true }).lean(),
    notify(original.users, 'CHAT-GROUP', { chatGroupIds: [id] }),
    syncSatellite(
      { tenantId: original.tenant, userIds: original.users },
      {
        chatGroupIds: [id],
        ...(logoUrl && original.logoUrl !== logoUrl && { minioAddItems: [logoUrl] }),
        ...(original.logoUrl && original.logoUrl !== logoUrl && { minioRemoveItems: [original.logoUrl] }),
      },
    ),
  ]);

  return chatGroup!;
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
      case 'addAdmins':
      case 'addUsers':
        return res.status(200).json({ data: await addMembers(req, { id, ...req.body }, action) });
      case 'join':
        return res.status(200).json({ data: await join(req, { id }) });
      case 'leave':
        return res.status(200).json(await leave(req, { id }));
      case 'removeUsers':
        return res.status(200).json({ data: await removeUsers(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  addMembers,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  join,
  leave,
  removeUsers,
  update,
  updateById,
};
