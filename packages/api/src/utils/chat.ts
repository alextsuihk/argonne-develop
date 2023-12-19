/**
 * Chat
 *
 */

import type { Locale } from '@argonne/common';
import { LOCALE } from '@argonne/common';
import type { Types, UpdateQuery } from 'mongoose';

import { signContentIds } from '../controllers/content';
import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import type { ChatGroupDocument } from '../models/chat-group';
import ChatGroup from '../models/chat-group';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import User from '../models/user';
import { mongoId } from './helper';
import type { BulkWrite } from './notify-sync';
import { notifySync } from './notify-sync';

const { MSG_ENUM } = LOCALE;
const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { CHAT_GROUP } = LOCALE.DB_ENUM;

/**
 * Extract message based on userLocale
 */
export const extract = (msg: Locale | string, userLocale?: string) =>
  typeof msg === 'string'
    ? msg
    : userLocale === zhHK
      ? msg.zhHK
      : userLocale === zhCN
        ? msg.zhCN || msg.zhHK
        : msg.enUS;

/**
 * Send Message to System Admins
 * only notify without sync to satellite
 */
export const messageToAdmins = async (
  msg: Locale | string,
  userId: Types.ObjectId,
  userLocale: string,
  isAdmin = false,
  userIds: Types.ObjectId[] = [],
  key = '(CORE Info)',
  title?: Locale | string,
) => {
  const { adminIds } = await User.findSystemAccountIds();

  const uniqueUserIds = Array.from(new Set([...adminIds, userId, ...userIds].map(u => u.toString())));

  const chatId = mongoId();
  const update: UpdateQuery<ChatGroupDocument> = {
    key,
    title: title ? extract(title, userLocale) : key,
    membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
    $addToSet: {
      flags: [CHAT_GROUP.FLAG.ADMIN, ...(isAdmin ? [CHAT_GROUP.FLAG.ADMIN_JOINED] : [])],
      chats: chatId,
      admins: { $each: adminIds },
      users: { $each: uniqueUserIds.map(id => mongoId(id)) },
    },
    $unset: { tenant: 1 },
  };
  const chatGroup = await ChatGroup.findOneAndUpdate({ key }, update, { new: true, upsert: true }).lean(); // create a new chatGroup if not exists

  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chatId}`],
    creator: userId,
    data: extract(msg, userLocale),
  });

  const chat = new Chat<Partial<ChatDocument>>({
    _id: chatId,
    parents: [`/chatGroups/${chatGroup._id}`],
    members: [{ user: userId, flags: [], lastViewedAt: new Date() }],
    contents: [content._id],
  });

  await Promise.all([
    chat.save(),
    content.save(),
    notifySync(null, { userIds: chatGroup.users, event: 'CHAT-GROUP' }, null), // notify ONLY (for chatGroup.messageToAdmins(), sync is archived in controller)
  ]);

  return { chatGroup, chat: chat.toObject(), content: content.toObject(), update };
};

/**
 * Start ChatGroup (with content)
 */
export const startChatGroup = async (
  tenantId: Types.ObjectId | null,
  msg: Locale | string,
  userIds: Types.ObjectId[],
  userLocale: string,
  key: string,
  flag?: string,
) => {
  const [user0Id] = userIds;
  if (!user0Id) throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const chatId = mongoId();
  const update: UpdateQuery<ChatGroupDocument> = {
    ...(tenantId ? { tenant: tenantId } : { $unset: { tenant: 1 } }),
    membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
    $addToSet: { chats: chatId, users: { $each: userIds }, ...(flag && { flags: flag }) }, //no admins
  };
  const chatGroup = await ChatGroup.findOneAndUpdate({ key }, update, { new: true, upsert: true }).lean(); // create a new chat if not exists

  const content = new Content<Partial<ContentDocument>>({
    parents: [`/chats/${chatId}`],
    creator: user0Id,
    data: extract(msg, userLocale),
  });
  const chat = new Chat<Partial<ChatDocument>>({
    _id: chatId,
    parents: [`/chatGroups/${chatGroup._id}`],
    members: [{ user: user0Id, flags: [], lastViewedAt: new Date() }],
    contents: [content._id],
  });

  await Promise.all([
    chat.save(),
    content.save(),
    notifySync(
      chatGroup.tenant || null, // only sync to one (primary) satellite of the sender
      { userIds: chatGroup.users, event: 'CHAT-GROUP' },
      {
        bulkWrite: {
          chatGroups: [
            { updateOne: { filter: { _id: chatGroup._id }, update, upsert: true } },
          ] satisfies BulkWrite<ChatGroupDocument>,
          chats: [{ insertOne: { document: chat } }] satisfies BulkWrite<ChatDocument>,
        },
        contentsToken: await signContentIds(null, [content._id]),
      },
    ),
  ]);

  return { chatGroup, chat: chat.toObject(), content: content.toObject(), update };
};
