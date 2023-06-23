/**
 * Common Useful Helpers
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import type { Types } from 'mongoose';

import type { ChatDocument, Id } from '../models/chat';
import Chat from '../models/chat';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import User from '../models/user';
import { idsToString, mongoId, prob, randomId, shuffle } from '../utils/helper';

const { CHAT, CONTENT } = LOCALE.DB_ENUM;

/**
 * Add Tenant to Users
 */
export const addTenantToUsers = async (userIds: (string | Types.ObjectId)[], tenantId: string | Types.ObjectId) =>
  User.updateMany({ _id: { $in: userIds } }, { $addToSet: { tenants: tenantId } });

/**
 * generate fake chats with contents (without saving)
 */
export const fakeChatsWithContents = (
  model: 'chatGroups' | 'classrooms',
  parentId: string | Types.ObjectId,
  userIds: (string | Types.ObjectId)[],
  chatMax: number,
  contentMax: number,
  recallable: boolean,
) => {
  const contents: (ContentDocument & Id)[] = [];

  const chats = Array(Math.ceil(Math.random() * chatMax))
    .fill(0)
    .map(_ => {
      const chatId = mongoId();
      const newContents = fakeContents(
        'chats',
        chatId,
        idsToString(userIds),
        Math.ceil(Math.random() * contentMax),
        recallable,
      );
      contents.push(...newContents);

      return new Chat<Partial<ChatDocument & Id>>({
        _id: chatId,
        ...(prob(0.5) && { title: `chat-title: ${faker.lorem.slug(10)}` }),
        parents: [`/${model}/${parentId}`],
        members: userIds
          .sort(shuffle)
          .slice(0, 3)
          .map(user => ({
            user,
            flags: prob(0.3) ? [CHAT.MEMBER.FLAG.IMPORTANT] : [],
            lastViewedAt: faker.date.recent(3),
          })),
        contents: idsToString(newContents),
      });
    });

  return { chats, contents };
};

/**
 * generate fake contents (without saving)
 */
export const fakeContents = (
  model: 'assignments' | 'bookAssignments' | 'chats' | 'homeworks' | 'question',
  parentId: string | Types.ObjectId,
  userIds: (string | Types.ObjectId)[],
  countMax: number,
  recallable = false,
) =>
  Array(Math.ceil(Math.random() * countMax))
    .fill(0)
    .map(
      _ =>
        new Content<Partial<ContentDocument>>({
          flags: recallable && prob(0.1) ? [CONTENT.FLAG.RECALLED] : [],
          parents: [`/${model}/${parentId}`],
          creator: randomId(userIds),
          data: `[/${model}/${parentId}] ${faker.lorem.sentences(10)}`,
          createdAt: faker.date.recent(30),
        }),
    );
