/**
 * Common Useful Helpers
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import type { Types } from 'mongoose';

import type { ChatDocument } from '../models/chat';
import Chat from '../models/chat';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import type { ContributionDocument } from '../models/contribution';
import Contribution from '../models/contribution';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import { mongoId, prob, randomItems } from '../utils/helper';

const { CHAT, CONTENT } = LOCALE.DB_ENUM;

/**
 * Add Tenant to Users
 */
export const addTenantToUsers = async (userIds: Types.ObjectId[], tenantId: Types.ObjectId) =>
  User.updateMany({ _id: { $in: userIds } }, { $addToSet: { tenants: tenantId } });

/**
 * generate fake chats with contents (without saving)
 */
export const fakeChatsWithContents = (
  parent: `/${'chatGroups' | 'classrooms'}/${string}`,
  userIds: Types.ObjectId[],
  chatMax: number,
  contentMax: number,
  recallable: boolean,
) => {
  const contents: ContentDocument[] = [];

  const chats = Array(Math.ceil(Math.random() * chatMax))
    .fill(0)
    .map(() => {
      const chatId = mongoId();
      const newContents = fakeContents(`/chats/${chatId}`, userIds, Math.ceil(Math.random() * contentMax), recallable);
      contents.push(...newContents);

      return new Chat<Partial<ChatDocument>>({
        _id: chatId,
        ...(prob(0.5) && { title: `chat-title: ${faker.lorem.slug(10)}` }),
        parents: [parent],
        members: randomItems(userIds, 3).map(user => ({
          user: user,
          flags: prob(0.3) ? [CHAT.MEMBER.FLAG.IMPORTANT] : [],
          lastViewedAt: faker.date.recent({ days: 10 }),
        })),
        contents: newContents.map(c => c._id),
      });
    });

  return { chats, contents };
};

/**
 * generate fake contents (without saving)
 */
export const fakeContents = (
  parent: `/${'assignments' | 'bookAssignments' | 'chats' | 'homeworks' | 'questions'}/${string}`,
  userIds: Types.ObjectId[],
  countMax: number,
  recallable = false,
) =>
  Array(Math.ceil(Math.random() * countMax))
    .fill(0)
    .map(
      () =>
        new Content<Partial<ContentDocument>>({
          flags: recallable && prob(0.1) ? [CONTENT.FLAG.RECALLED] : [],
          parents: [parent],
          creator: userIds[Math.floor(Math.random() * userIds.length)]!,
          data: `[/${parent}] ${faker.lorem.sentences(10)}`,
          createdAt: faker.date.recent({ days: 30 }),
        }),
    );

/**
 * generate fake contribution
 */
export const fakeContribution = (contributors: UserDocument[]) =>
  new Contribution<Partial<ContributionDocument>>({
    title: faker.lorem.slug(5),
    ...(prob(0.5) && { description: faker.lorem.sentences(3) }),
    contributors: contributors.map(user => ({
      user: user._id,
      name: faker.person.fullName(),
      school: user.schoolHistories[0]!.school,
    })),
    urls: Array(3)
      .fill(0)
      .map(() => faker.internet.url()),
  });
