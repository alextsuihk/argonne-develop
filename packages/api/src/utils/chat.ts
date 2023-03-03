/**
 * Chat
 *
 */

import type { DocumentSync, Locale } from '@argonne/common';
import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';

import common from '../controllers/common';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import ChatGroup from '../models/chat-group';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import { idsToString } from './helper';
import { notify } from './messaging';
import syncSatellite from './sync-satellite';

export type ChatResponse = Pick<DocumentSync, 'chatGroupIds' | 'classroomIds' | 'chatIds' | 'contentIds'>;

const { MSG_ENUM } = LOCALE;
const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { CHAT_GROUP, USER } = LOCALE.DB_ENUM;

const { select } = common;

export const extract = (msg: Locale | string, userLocale?: string) =>
  typeof msg === 'string'
    ? msg
    : userLocale === zhHK
    ? msg.zhHK
    : userLocale === zhCN
    ? msg.zhCN ?? msg.zhHK
    : msg.enUS;

/**
 * Join ChatGroup (with content)
 */
export const joinChatGroup = async (
  chatGroupId: string | Types.ObjectId,
  msg: Locale | string,
  userIds: (string | Types.ObjectId)[],
  userLocale: string,
): Promise<void> => {
  const chatGroup = await ChatGroup.findById(chatGroupId).lean();
  if (!chatGroup) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const newUsers = Array.from(new Set(idsToString(userIds))).filter(x => !idsToString(chatGroup.users).includes(x));

  const content = new Content<Partial<ContentDocument>>({ creator: userIds[0], data: extract(msg, userLocale) });
  const chat = new Chat<Partial<ChatDocument>>({
    parents: [`/chatGroups/${chatGroupId}`],
    members: newUsers.map(user => ({ user, flags: [] })),
    contents: [content._id],
  });
  content.parents = [`/chats/${chat._id}`];

  const ids: ChatResponse = {
    chatGroupIds: [chatGroupId.toString()],
    chatIds: [chat._id.toString()],
    contentIds: [content._id.toString()],
  };
  await Promise.all([
    ChatGroup.findByIdAndUpdate(chatGroupId, { $push: { users: { $each: newUsers }, chats: chat._id } }).lean(),
    chat.save(),
    content.save(),
    notify([...chatGroup.users, ...userIds], 'CHAT', ids),
    syncSatellite({ tenantId: chatGroup.tenant, userIds: [...chatGroup.users, ...userIds] }, ids),
  ]);

  // return ids;
};

/**
 * Send Message to Admin
 */
export const messageToAdmin = async (
  msg: Locale | string,
  userId: string | Types.ObjectId,
  userLocale: string,
  userRoles: string[],
  userIds: (string | Types.ObjectId)[],
  adminKey: string,
  userName?: string,
  skipNotify?: boolean,
) => {
  const users = Array.from(new Set([...idsToString(userIds), userId.toString()]));

  const chatGroup = await ChatGroup.findOneAndUpdate(
    { adminKey },
    {
      adminKey,
      title: userName ? `${adminKey} (${userName})` : adminKey,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      $addToSet: { users: { $each: users } },
    },
    { new: true, upsert: true },
  ).lean(); // create a new chatGroup if not exists

  const content = new Content<Partial<ContentDocument>>({ creator: userId, data: extract(msg, userLocale) });
  const chat = new Chat<Partial<ChatDocument>>({
    parents: [`/chatGroups/${chatGroup._id}`],
    members: [
      { user: userId, flags: [], lastViewedAt: new Date() },
      ...users.filter(user => user !== userId.toString()).map(user => ({ user, flags: [] })),
    ],
    contents: [content._id],
  });
  content.parents = [`/chats/${chat._id}`];

  const flags =
    userRoles.includes(USER.ROLE.ADMIN) && !chatGroup.flags.includes(CHAT_GROUP.FLAG.ADMIN_JOINED)
      ? [...chatGroup.flags, CHAT_GROUP.FLAG.ADMIN_JOINED]
      : chatGroup.flags;

  const ids: ChatResponse = {
    chatGroupIds: [chatGroup._id.toString()],
    chatIds: [chat._id.toString()],
    contentIds: [content._id.toString()],
  };
  const [updatedChatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      chatGroup,
      { flags, $push: { chats: chat._id } },
      { fields: select(), new: true },
    ).lean(),
    chat.save(),
    content.save(),
    skipNotify || notify(chatGroup.users, 'CHAT', ids),
    syncSatellite({ tenantId: chatGroup.tenant, userIds: chatGroup.users }, ids),
  ]);

  return updatedChatGroup!;
};

/**
 * Start ChatGroup (with content)
 */
export const startChatGroup = async (
  tenantId: string | Types.ObjectId | null,
  msg: Locale | string,
  [user0Id, ...userIds]: (string | Types.ObjectId)[],
  userLocale: string,
  key: string,
) => {
  if (!user0Id) throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const chatGroup = await ChatGroup.findOneAndUpdate(
    { key },
    { $addToSet: { users: { $each: [user0Id, ...userIds] } } },
    { new: true, upsert: true },
  ).lean(); // create a new chat if not exists

  const content = new Content<Partial<ContentDocument>>({
    creator: user0Id.toString(),
    data: extract(msg, userLocale),
  });
  const chat = new Chat<Partial<ChatDocument>>({
    parents: [`/chatGroups/${chatGroup._id}`],
    members: [{ user: user0Id, flags: [], lastViewedAt: new Date() }, ...userIds.map(user => ({ user, flags: [] }))],
    contents: [content._id],
  });
  content.parents = [`/chats/${chat._id}`];

  const ids: ChatResponse = {
    chatGroupIds: [chatGroup._id.toString()],
    chatIds: [chat._id.toString()],
    contentIds: [content._id.toString()],
  };

  const [updatedChatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(chatGroup, { $push: { chats: chat._id } }, { fields: select(), new: true }).lean(),
    chat.save(),
    content.save(),
    notify(chatGroup.users, 'CHAT', ids),
    syncSatellite({ ...(tenantId && { tenantId }), userIds: chatGroup.users }, ids),
  ]);

  return updatedChatGroup!;
};
