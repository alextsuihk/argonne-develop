/**
 * Controller: Chats
 *
 */

import { CONTENT_PREFIX, LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import type { ChatDocument } from '../models/chat';
import Chat, { searchableFields } from '../models/chat';
import type { ChatGroupDocument } from '../models/chat-group';
import ChatGroup from '../models/chat-group';
import type { ClassroomDocument } from '../models/classroom';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import DatabaseEvent from '../models/event/database';
import censor from '../utils/censor';
import type { ChatResponse } from '../utils/chat';
import { idsToString, schoolYear } from '../utils/helper';
import { notify } from '../utils/messaging';
import syncSatellite from '../utils/sync-satellite';
import common, { signContentIds } from './common';

type Action =
  | 'attachToClassroom'
  | 'blockContent'
  | 'clearFlag'
  | 'recallContent'
  | 'setFlag'
  | 'updateLastViewedAt'
  | 'updateTitle';

type ChatDocumentEx = LeanDocument<ChatDocument> & { contentsToken?: string }; // attach contentsToken only when contents are updated

const { MSG_ENUM } = LOCALE;
const { CHAT, CONTENT, CHAT_GROUP } = LOCALE.DB_ENUM;

const { assertUnreachable, auth, authCheckUserSuspension, isAdmin, paginateSort, searchFilter, select } = common;
const {
  chatParentSchema,
  classroomIdSchema,
  contentIdSchema,
  contentSchema,
  flagSchema,
  idSchema,
  optionalIdSchema,
  optionalTitleSchema,
  querySchema,
  removeSchema,
  optionalTimestampSchema,
} = yupSchema;

/**
 * (helper) check if user is in chatGroup.users or classroom.teachers or classroom.students
 */
export const checkOwnership = async (
  userId: string,
  parent: string,
  type: 'ADMIN_TEACHER' | 'USER',
): Promise<
  | { model: 'chatGroups'; id: string; parentDoc: LeanDocument<ChatGroupDocument> }
  | { model: 'classrooms'; id: string; parentDoc: LeanDocument<ClassroomDocument> }
> => {
  const [model, id] = parent.split('/').splice(1); // parent = '/chatGroups/chatGroupId or /classrooms/classroomId

  if (!(model === 'chatGroups' || model === 'classrooms') || !id)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  if (model === 'chatGroups') {
    const chatGroup = await ChatGroup.findOne(
      type === 'USER' ? { _id: id, users: userId } : { _id: id, admins: userId },
      select(),
    ).lean();
    if (!chatGroup) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    return { model, id, parentDoc: chatGroup };
  } else {
    const classroom = await Classroom.findOne(
      type === 'USER' ? { _id: id, $or: [{ teachers: userId }, { students: userId }] } : { _id: id, teachers: userId },
      select(),
    ).lean();
    if (!classroom || ![schoolYear(), schoolYear(1)].includes(classroom.year))
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    return { model, id, parentDoc: classroom };
  }
};

/**
 * Attach a chat from a classroom or a chatGroup to a classroom
 * userId must be an admin or teacher of origin classroom chatGroup AND teacher of destination classroom
 */
const attachToClassroom = async (req: Request, args: unknown): Promise<ChatDocumentEx> => {
  const { userId } = auth(req);
  const { id, classroomId, parent } = await chatParentSchema.concat(classroomIdSchema).concat(idSchema).validate(args);

  const [{ parentDoc }, original, classroom] = await Promise.all([
    checkOwnership(userId, parent, 'ADMIN_TEACHER'),
    Chat.findOne({ _id: id, parents: parent }).lean(),
    Classroom.findOne({ _id: classroomId, teachers: userId, chats: { $ne: id } }).lean(),
  ]);

  if (
    !original ||
    !classroom ||
    original.parents.includes(`/classrooms/${classroomId}`) ||
    parentDoc.tenant?.toString() !== classroom.tenant.toString()
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const newMembers = idsToString([...classroom.students, ...classroom.teachers])
    .filter(x => !idsToString(original.members.map(m => m.user)).includes(x))
    .map(user => ({ user, flags: [] }));

  const [chat] = await Promise.all([
    Chat.findOneAndUpdate(
      { _id: id },
      { $push: { parents: `/classrooms/${classroomId}`, members: { $each: newMembers } } },
      { fields: select(), new: true },
    ),
    Classroom.findOneAndUpdate({ _id: classroomId }, { $push: { chats: id } }).lean(),
  ]);
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = idsToString(chat.members.map(m => m.user));
  const ids: ChatResponse = { classroomIds: [classroomId], chatIds: [id] };
  await Promise.all([
    notify(userIds, 'CHAT', ids),
    syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids), //chat.tenantId could be undefined for admin-chat
  ]);

  return req.isApollo ? chat : chat.populate([{ path: 'contents', select: select() }]);
};

/**
 * Block a content by (ONLY) classroom.teachers or chatGroup.admins
 *
 */
const blockContent = async (req: Request, args: unknown): Promise<ChatDocumentEx> => {
  const { userId } = auth(req);
  const { id, contentId, parent, remark } = await chatParentSchema
    .concat(contentIdSchema)
    .concat(removeSchema)
    .validate(args);

  const [{ parentDoc }, chat, content] = await Promise.all([
    checkOwnership(userId, parent, 'ADMIN_TEACHER'), // only chatAdmin or classroomTeacher
    Chat.findOneAndUpdate(
      { _id: id, parents: parent, contents: contentId },
      { updatedAt: new Date() },
      { fields: select(), new: true },
    ), // touch chatDocument to trigger re-fetch
    Content.findOne({ _id: contentId, parents: `/chats/${id}`, flags: { $ne: CONTENT.FLAG.BLOCKED } }).lean(),
  ]);

  if (!chat || !content || !idsToString(parentDoc.chats).includes(id))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = idsToString(chat.members.map(m => m.user));
  const ids: ChatResponse = { chatIds: [id], contentIds: [contentId] };
  await Promise.all([
    Content.findByIdAndUpdate(contentId, {
      $push: { flags: CONTENT.FLAG.BLOCKED },
      data: `${CONTENT_PREFIX.BLOCKED}${Date.now()}###${userId}`,
    }).lean(),
    DatabaseEvent.log(userId, `${parent}/${contentId}`, 'BLOCK', { remark, data: content.data }),
    notify(userIds, 'CHAT', ids),
    syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids), // tenantId could be undefined for admin-chat
  ]);

  return req.isApollo
    ? { ...chat.toObject(), contentsToken: await signContentIds(userId, [contentId]) } // trigger client to fetch updatedContent(s)
    : chat.populate([{ path: 'contents', select: select() }]);
};

/**
 * create (add content)
 */
const create = async (req: Request, args: unknown): Promise<ChatDocumentEx> => {
  const { userId, userLocale, userRoles } = auth(req);
  await authCheckUserSuspension(req);

  const {
    id,
    title,
    parent,
    content: data,
  } = await chatParentSchema.concat(contentSchema).concat(optionalIdSchema).concat(optionalTitleSchema).validate(args);

  const { model, parentDoc } = await checkOwnership(userId, parent, 'USER'); // chat.users or classroom.teacher or classroom.student could add content

  if (id && idsToString(parentDoc.chats).includes(id)) {
    // append content to existing chat
    const content = new Content<Partial<ContentDocument>>({
      flags: model === 'chatGroups' && isAdmin(userRoles) && parentDoc.adminKey ? [CONTENT.FLAG.ADMIN] : [],
      parents: [`/chats/${id}`],
      creator: userId,
      data,
    });

    // append contentId
    await Chat.findOneAndUpdate({ _id: id, parents: parent }, { $push: { contents: content._id } }).lean();

    // update userId members.lastViewedAt
    const chat = await Chat.findOneAndUpdate(
      { _id: id, parents: parent, 'members.user': userId },
      { 'members.$.lastViewedAt': addSeconds(Date.now(), 1) },
      { fields: select(), new: true },
    );
    if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    const userIds = idsToString(chat.members.map(m => m.user));
    const ids: ChatResponse = { chatIds: [id], contentIds: [content._id.toString()] };
    await Promise.all([
      content.save(),
      notify(userIds, 'CHAT', ids),
      syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids), //chat.tenantId could be undefined for admin-chat
      parentDoc.tenant && censor(parentDoc.tenant, parent, content, userLocale),
    ]);

    return req.isApollo
      ? { ...chat.toObject(), contentsToken: await signContentIds(userId, idsToString(chat.contents)) } // trigger client to fetch updatedContent(s)
      : chat.populate([{ path: 'contents', select: select() }]);
  }

  // create a new chat
  const userIds =
    model === 'chatGroups' ? idsToString(parentDoc.users) : idsToString([...parentDoc.teachers, ...parentDoc.students]);
  const chat = new Chat<Partial<ChatDocument>>({
    parents: [`/${model}/${parentDoc._id}`],
    ...(title && { title }),
    members: [
      { user: userId, flags: [], lastViewedAt: new Date() },
      ...userIds.filter(user => user !== userId).map(user => ({ user, flags: [] })),
    ],
  });
  const content = new Content<Partial<ContentDocument>>({
    flags: model === 'chatGroups' && isAdmin(userRoles) && parentDoc.adminKey ? [CONTENT.FLAG.ADMIN] : [],
    parents: [`/chats/${chat._id}`],
    creator: userId,
    data,
  });
  chat.contents.push(content._id);

  model === 'chatGroups'
    ? await ChatGroup.findByIdAndUpdate(parentDoc, { $push: { chats: chat._id } }).lean()
    : await Classroom.findByIdAndUpdate(parentDoc, { $push: { chats: chat._id } }).lean();

  const ids: ChatResponse = {
    ...(model === 'chatGroups'
      ? { chatGroupIds: [parentDoc._id.toString()] }
      : { classroomIds: [parentDoc._id.toString()] }),
    chatIds: [chat._id.toString()],
    contentIds: [content._id.toString()],
  };

  await Promise.all([
    chat.save(),
    content.save(),
    notify(userIds, 'CHAT', ids),
    syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids),
    model === 'chatGroups' && parentDoc.tenant && censor(parentDoc.tenant, parent, content, userLocale),
  ]);

  return req.isApollo
    ? { ...chat.toObject(), contentsToken: await signContentIds(userId, idsToString(chat.contents)) } // trigger client to fetch updatedContent(s)
    : chat.populate([{ path: 'contents', select: select() }]);
};

/**
 * Create New Chat (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, req.body) });
  } catch (error) {
    next(error);
  }
};

const getAdminChatIds = async () => {
  const adminChatGroups = await ChatGroup.find({ adminKey: { $exists: true }, deletedAt: { $exists: false } }).lean();
  return adminChatGroups.map(g => idsToString(g.chats)).flat();
};

/**
 * Find Multiple Chats (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<ChatDocumentEx[]> => {
  const { userId, userRoles } = auth(req);
  const [{ query }, adminChatIds] = await Promise.all([
    querySchema.validate(args),
    isAdmin(userRoles) ? getAdminChatIds() : [],
  ]);

  const filter = searchFilter<ChatDocument>(
    searchableFields,
    { query },
    { $or: [{ 'members.user': userId }, { _id: { $in: adminChatIds } }] },
  );

  const chats = await Chat.find(filter, select()).lean();

  return Promise.all(
    chats.map(async chat => ({
      ...chat,
      ...(chat.members.some(m => m.user.toString() === userId && m.flags.includes(CHAT.MEMBER.FLAG.REMOVED))
        ? { contents: [] } // if member is removed, remove empty contents []
        : { contentsToken: await signContentIds(userId, idsToString(chat.contents)) }),
    })),
  );
};

/**
 * Find Multiple Chats with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userRoles } = auth(req);
    const [{ query }, adminChatIds] = await Promise.all([
      querySchema.validate({ query: req.query }),
      isAdmin(userRoles) ? getAdminChatIds() : [],
    ]);

    const filter = searchFilter<ChatDocument>(
      searchableFields,
      { query },
      { $or: [{ 'members.user': userId }, { _id: { $in: adminChatIds } }] },
    );
    const options = paginateSort(req.query, { updatedAt: 1 });

    const [total, chats] = await Promise.all([
      Chat.countDocuments(filter),
      Chat.find(filter, select(), options)
        .populate([{ path: 'contents', select: select() }])
        .lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: chats.map(chat => ({
        ...chat,
        ...(chat.members.some(m => m.user.toString() === userId && m.flags.includes(CHAT.MEMBER.FLAG.REMOVED)) && {
          contents: [],
        }), // if member is removed, remove empty contents []
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Chat by ID
 */
const findOne = async (req: Request, args: unknown): Promise<ChatDocumentEx | null> => {
  const { userId, userRoles } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<ChatDocument>(
    searchableFields,
    { query },
    {
      $or: [
        { _id: id, 'members.user': userId },
        { _id: isAdmin(userRoles) && (await getAdminChatIds()).includes(id) ? id : null },
      ],
    },
  );

  const chat = await Chat.findOne(filter, select());

  return (
    chat &&
    (req.isApollo
      ? {
          ...chat.toObject(),
          ...(chat.members.some(m => m.user.toString() === userId && m.flags.includes(CHAT.MEMBER.FLAG.REMOVED))
            ? { contents: [] } // if userId is removed, empty contents []
            : { contentsToken: await signContentIds(userId, idsToString(chat.contents)) }), // trigger client to fetch updatedContent(s)
        }
      : chat.members.some(m => m.user.toString() === userId && m.flags.includes(CHAT.MEMBER.FLAG.REMOVED))
      ? { ...chat.toObject(), contents: [] }
      : chat.populate([{ path: 'contents', select: select() }]))
  );
};

/**
 * Find One Chat by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const chat = await findOne(req, { id: req.params.id });
    chat ? res.status(200).json({ data: chat }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Recall a (chatGroup or classroom) chat content
 */
const recallContent = async (req: Request, args: unknown): Promise<ChatDocumentEx> => {
  const { userId } = auth(req);
  const { id, parent, contentId } = await chatParentSchema.concat(contentIdSchema).concat(idSchema).validate(args);

  const [{ parentDoc }, chat, content] = await Promise.all([
    checkOwnership(userId, parent, 'USER'),
    Chat.findOneAndUpdate(
      {
        _id: id,
        parents: parent,
        members: { $elemMatch: { user: userId, flags: { $ne: CHAT.MEMBER.FLAG.REMOVED } } },
        contents: contentId,
      },
      { updatedAt: new Date() },
      { fields: select(), new: true },
    ), // touch chatDocument to trigger re-fetch
    Content.findOne(
      { _id: contentId, parents: `/chats/${id}`, creator: userId, flags: { $ne: CONTENT.FLAG.RECALLED } },
      select(),
    ).lean(),
  ]);
  if (!chat || !content || !chat.parents[0]) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = idsToString(chat.members.map(m => m.user));
  const ids: ChatResponse = { chatIds: [id], contentIds: [contentId] };

  await Promise.all([
    Content.findByIdAndUpdate(contentId, {
      $push: { flags: CONTENT.FLAG.RECALLED },
      data: `${CONTENT_PREFIX.RECALLED}${Date.now()}###${userId}`,
    }).lean(),
    DatabaseEvent.log(userId, `/contents/${contentId}`, 'RECALL', { data: content.data }),
    notify(userIds, 'CHAT', ids),
    syncSatellite({ tenantId: parentDoc.tenant, userIds }, ids), // tenantId could be undefined for admin-chat
  ]);

  return req.isApollo
    ? { ...chat.toObject(), contentsToken: await signContentIds(userId, [contentId]) } // trigger client to fetch updatedContent(s)
    : chat.populate([{ path: 'contents', select: select() }]);
};

/**
 * Update Flag (in members)
 */
const updateFlag = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'setFlag' | 'clearFlag'>,
): Promise<ChatDocumentEx> => {
  const { userId } = auth(req);
  const { id, flag, parent } = await chatParentSchema.concat(flagSchema).concat(idSchema).validate(args);

  const { parentDoc } = await checkOwnership(userId, parent, 'USER');
  if (!Object.keys(CHAT.MEMBER.FLAG).includes(flag) || !idsToString(parentDoc.chats).includes(id))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const chat =
    action === 'setFlag'
      ? await Chat.findOneAndUpdate(
          { _id: id, members: { $elemMatch: { user: userId, flags: { $ne: flag } } } },
          { $push: { 'members.$.flags': flag }, $set: { 'members.$.lastViewedAt': new Date() } },
          { fields: select(), new: true },
        )
      : await Chat.findOneAndUpdate(
          { _id: id, members: { $elemMatch: { user: userId, flags: flag } } },
          { $pull: { 'members.$.flags': flag }, $set: { 'members.$.lastViewedAt': new Date() } },
          { fields: select(), new: true },
        );
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = idsToString(chat.members.map(m => m.user));
  await Promise.all([
    notify(userIds, 'CHAT', { chatIds: [id] }),
    syncSatellite({ tenantId: parentDoc.tenant, userIds }, { chatIds: [id] }), //chat.tenantId could be undefined for admin-chat
  ]);

  return req.isApollo ? chat : chat.populate([{ path: 'contents', select: select() }]);
};

/**
 * Update LastViewedAt
 */
const updateLastViewedAt = async (req: Request, args: unknown): Promise<ChatDocumentEx> => {
  const { userId, userRoles } = auth(req);
  const {
    id,
    parent,
    timestamp = new Date(),
  } = await chatParentSchema.concat(idSchema).concat(optionalTimestampSchema).validate(args);

  const { model, parentDoc } = await checkOwnership(userId, parent, 'USER');
  if (!idsToString(parentDoc.chats).includes(id)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // handle admin-chat case, join chatGroup & mark ADMIN_JOINED if needed
  if (model === 'chatGroups' && parentDoc.adminKey && idsToString(parentDoc.chats).includes(id) && isAdmin(userRoles))
    await Promise.all([
      // push ADMIN_JOIN (if not joined) & add userId to users & admins (if not yet joined)
      (!parentDoc.flags.includes(CHAT_GROUP.FLAG.ADMIN_JOINED) || !idsToString(parentDoc.users).includes(userId)) &&
        ChatGroup.findByIdAndUpdate(parentDoc, {
          $addToSet: { flag: CHAT_GROUP.FLAG.ADMIN_JOINED, users: userId, admins: userId },
        }).lean(),

      // add userId to chat.members
      Chat.findOneAndUpdate(
        { _id: id, parents: parent, 'members.user': { $ne: userId } },
        { $push: { members: { user: userId, flags: [], lastViewedAt: timestamp } } },
      ).lean(),
    ]);

  // !Note: not work without arrayFilters (not sure what is wrong?)
  const chat = await Chat.findOneAndUpdate(
    { _id: id, parents: parent, 'members.user': userId },
    { $set: { 'members.$[elem].lastViewedAt': timestamp } },
    { arrayFilters: [{ 'elem.user': userId }], fields: select(), new: true },
  );
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = idsToString(chat.members.map(m => m.user));
  await Promise.all([
    notify(userIds, 'CHAT', { chatIds: [id] }),
    syncSatellite({ tenantId: parentDoc.tenant, userIds }, { chatIds: [id] }), //chat.tenantId could be undefined for admin-chat
  ]);

  return req.isApollo ? chat : chat.populate([{ path: 'contents', select: select() }]);
};

/**
 * Update Chat Title
 */
const updateTitle = async (req: Request, args: unknown): Promise<ChatDocumentEx> => {
  const { userId } = auth(req);
  const { id, parent, title } = await chatParentSchema.concat(idSchema).concat(optionalTitleSchema).validate(args);

  const { parentDoc } = await checkOwnership(userId, parent, 'ADMIN_TEACHER');
  if (!idsToString(parentDoc.chats).includes(id)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const chat = await Chat.findOneAndUpdate({ _id: id, parents: parent }, title ? { title } : { $unset: { title: 1 } }, {
    fields: select(),
    new: true,
  });
  if (!chat) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const userIds = idsToString(chat.members.map(m => m.user));
  await Promise.all([
    notify(userIds, 'CHAT', { chatIds: [id] }),
    syncSatellite({ tenantId: parentDoc.tenant, userIds }, { chatIds: [id] }), //chat.tenantId could be undefined for admin-chat
  ]);

  return req.isApollo ? chat : chat.populate([{ path: 'contents', select: select() }]);
};

/**
 * Update Chat (RESTful)
 */
const updateById: RequestHandler<{ id: string; action: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case 'attachToClassroom':
        return res.status(200).json({ data: await attachToClassroom(req, { id, ...req.body }) });
      case 'blockContent':
        return res.status(200).json({ data: await blockContent(req, { id, ...req.body }) });
      case 'clearFlag':
        return res.status(200).json({ data: await updateFlag(req, { id, ...req.body }, action) });
      case 'recallContent':
        return res.status(200).json({ data: await recallContent(req, { id, ...req.body }) });
      case 'setFlag':
        return res.status(200).json({ data: await updateFlag(req, { id, ...req.body }, action) });
      case 'updateLastViewedAt':
        return res.status(200).json({ data: await updateLastViewedAt(req, { id, ...req.body }) });
      case 'updateTitle':
        return res.status(200).json({ data: await updateTitle(req, { id, ...req.body }) });

      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  attachToClassroom,
  blockContent,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  recallContent,
  updateById,
  updateFlag,
  updateLastViewedAt,
  updateTitle,
};
