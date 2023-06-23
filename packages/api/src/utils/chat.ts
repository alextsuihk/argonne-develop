/**
 * Chat
 *
 */

import type { Locale } from '@argonne/common';
import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';

import common from '../controllers/common';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import ChatGroup from '../models/chat-group';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import User from '../models/user';
import { idsToString } from './helper';
import log from './log';
import { notifySync } from './notify-sync';

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
    ? msg.zhCN || msg.zhHK
    : msg.enUS;

/**
 * Send Message to Admin
 */
export const messageToAdmin = async (
  msg: Locale | string,
  userId: string | Types.ObjectId,
  userLocale: string,
  userRoles: string[],
  userIds: (string | Types.ObjectId)[],
  key: string,
  userName?: string,
  skipNotify?: boolean,
) => {
  const { adminIds } = await User.findSystemAccountIds();
  const uniqueUserIds = Array.from(new Set([...adminIds, ...idsToString([userId, ...userIds])]));

  const title = !userName
    ? key
    : userLocale === 'zhHK'
    ? `管理員留言 (${userName})`
    : userLocale === 'zhCN'
    ? `管理员留言 (${userName})`
    : `Admin Message (${userName})`;
  const { _id, tenant, users } = await ChatGroup.findOneAndUpdate(
    { key },
    {
      key,
      title,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      $addToSet: { flags: CHAT_GROUP.FLAG.ADMIN, admins: { $each: adminIds }, users: { $each: uniqueUserIds } },
    },
    { new: true, upsert: true },
  ).lean(); // create a new chatGroup if not exists

  const content = new Content<Partial<ContentDocument>>({ creator: userId, data: extract(msg, userLocale) });
  const chat = await Chat.create<Partial<ChatDocument>>({
    parents: [`/chatGroups/${_id}`],
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    contents: [content._id],
  });
  content.parents = [`/chats/${chat._id}`];

  const [updatedChatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      _id,
      {
        $push: { chats: chat._id },
        ...(userRoles.includes(USER.ROLE.ADMIN) && { $addToSet: { flags: CHAT_GROUP.FLAG.ADMIN_JOINED } }),
      },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    content.save(),
    notifySync(
      'CHAT-GROUP',
      { tenantId: tenant, ...(!skipNotify && { userIds: users }) },
      { chatGroupIds: [_id], chatIds: [chat], contentIds: [content] },
    ),
  ]);

  if (updatedChatGroup) return updatedChatGroup;
  log('error', 'utils/chat:messageToAdmin()', { msg, userIds, key }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Start ChatGroup (with content)
 */
export const startChatGroup = async (
  tenantId: string | Types.ObjectId | null,
  msg: Locale | string,
  userIds: (string | Types.ObjectId)[],
  userLocale: string,
  key: string,
  flag?: string,
) => {
  const [user0Id] = userIds;
  if (!user0Id) throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const chatGroup = await ChatGroup.findOneAndUpdate(
    { key },
    {
      ...(tenantId ? { tenant: tenantId } : { $unset: { tenant: 1 } }),
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      $addToSet: { users: { $each: userIds }, ...(flag && { flags: flag }) }, //no admins
    },
    { new: true, upsert: true },
  ).lean(); // create a new chat if not exists

  const content = new Content<Partial<ContentDocument>>({ creator: user0Id, data: extract(msg, userLocale) });
  const chat = await Chat.create<Partial<ChatDocument>>({
    parents: [`/chatGroups/${chatGroup._id}`],
    members: [{ user: user0Id, flags: [], lastViewedAt: new Date() }],
    contents: [content._id],
  });
  content.parents = [`/chats/${chat._id}`];

  const [updatedChatGroup] = await Promise.all([
    ChatGroup.findByIdAndUpdate(
      chatGroup,
      { $push: { chats: chat._id } },
      { fields: select(), new: true, populate: [{ path: 'chats', select: select() }] },
    ).lean(),
    content.save(),
    notifySync(
      'CHAT-GROUP',
      { ...(tenantId && { tenantId }), userIds: chatGroup.users },
      { chatGroupIds: [chatGroup], chatIds: [chat], contentIds: [content] },
    ),
  ]);

  if (updatedChatGroup) return updatedChatGroup;
  log('error', 'utils/chat:startChatGroup()', { tenantId, msg, userIds, key }, user0Id);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};
