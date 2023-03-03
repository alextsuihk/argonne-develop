/**
 * Factory: Chat
 *
 * Note:
 *  system chat: chat between admin and SINGLE user
 *  normal chat: chat between multiple users
 *
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import mongoose from 'mongoose';

import type { ChatDocument } from '../../models/chat';
import Chat from '../../models/chat';
import type { ChatGroupDocument } from '../../models/chat-group';
import ChatGroup from '../../models/chat-group';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import Tenant from '../../models/tenant';
import User from '../../models/user';
import { messageToAdmin } from '../../utils/chat';
import { idsToString, prob, shuffle } from '../../utils/helper';
import { fakeContents } from './helper';

const { CHAT, CHAT_GROUP, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 * @param chatGroupCount: number of chatGroups (per user)
 * @param chatMax: max chats (per chatGroup)
 * @param contentMax: max contents(per chat)
 */
const fake = async (chatGroupCount = 5, chatMax = 5, contentMax = 6): Promise<string> => {
  const [users, adminUser, tenants] = await Promise.all([
    User.find({ status: USER.STATUS.ACTIVE }).lean(),
    User.findOneActive({ roles: USER.ROLE.ADMIN }),
    Tenant.find({ services: TENANT.SERVICE.CHAT_GROUP, deletedAt: { $exists: false } }).lean(),
  ]);

  if (!users.length) throw new Error('User Collection is empty');
  if (!adminUser) throw new Error('User Collection has ADMIN user');

  // Part 1: generate one (toAdmin) chat per activeUser
  await Promise.all(
    users.map(async user =>
      messageToAdmin(
        `msg to admin: ${faker.lorem.sentences(2)}`,
        user._id,
        user.locale,
        user.roles,
        [],
        `USER#${user._id}`,
        user.name,
        true, // skipNotify
      ),
    ),
  );

  // Part 2: generate normal (among normal user) contents
  const chats: ChatDocument[] = [];
  const contents: ContentDocument[] = [];

  const chatGroups = tenants
    .map(tenant =>
      users
        .filter(user => idsToString(user.tenants).includes(tenant._id.toString()))
        .map((user, idx) =>
          Array(Math.ceil(Math.random() * chatGroupCount))
            .fill(0)
            .map(_ => {
              {
                // find (up to 6) other users (excluding himself, but in the same tenantId)
                const otherUsers = users
                  .slice(idx + 1)
                  .sort(shuffle)
                  .filter(u => idsToString(u.tenants).includes(tenant._id.toString()))
                  .slice(0, 6);

                const chatGroupId = new mongoose.Types.ObjectId();

                const newChats = Array(Math.ceil(Math.random() * chatMax))
                  .fill(0)
                  .map(_ => {
                    const chatId = new mongoose.Types.ObjectId();
                    const newContents = fakeContents(
                      chatId,
                      idsToString([user, ...otherUsers]),
                      Math.ceil(Math.random() * contentMax),
                      true,
                    );

                    contents.push(...newContents);

                    return new Chat<Partial<ChatDocument>>({
                      _id: chatId,
                      ...(prob(0.5) && { title: `chat-title: ${faker.lorem.slug(10)}` }),
                      parents: [`/chatGroups/${chatGroupId}`],
                      members: [user, ...otherUsers]
                        .sort(shuffle)
                        .slice(0, 3)
                        .map(user => ({
                          user: user._id,
                          flags: prob(0.3) ? [CHAT.MEMBER.FLAG.IMPORTANT] : [],
                          lastViewedAt: faker.date.recent(3),
                        })),
                      contents: newContents.map(content => content._id),
                    });
                  });
                chats.push(...newChats);

                return new ChatGroup<Partial<ChatGroupDocument>>({
                  _id: chatGroupId,
                  tenant: tenant._id.toString(),
                  membership: prob(0.5)
                    ? CHAT_GROUP.MEMBERSHIP.NORMAL
                    : prob(0.5)
                    ? CHAT_GROUP.MEMBERSHIP.CLOSED
                    : CHAT_GROUP.MEMBERSHIP.PUBLIC,
                  ...(prob(0.8) && { title: `chat-title : ${faker.lorem.slug(5)}` }),
                  ...(prob(0.5) && { description: `chat-desc : ${faker.lorem.sentences(5)}` }),
                  users: idsToString([user, ...otherUsers]),
                  admins: [user._id],
                  chats: idsToString(newChats),
                  createdAt: new Date(Math.min(...newChats.map(t => t.createdAt.getTime()))),
                  ...(prob(0.5) && { logoUrl: faker.internet.avatar() }),
                });
              }
            }),
        )
        .flat(),
    )
    .flat();

  await Promise.all([ChatGroup.create(chatGroups), Chat.create(chats), Content.create(contents)]);
  const msg = `(${chalk.green(users.length)} + ${chalk.green(chatGroups.length)} chatGroups, `;
  return `(${msg} - ${chalk.green(chats.length)} - ${chalk.green(contents.length)} created)`;
};

export { fake };
