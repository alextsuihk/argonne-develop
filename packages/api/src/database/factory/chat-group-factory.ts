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

import type { ChatDocument } from '../../models/chat';
import Chat from '../../models/chat';
import type { ChatGroupDocument } from '../../models/chat-group';
import ChatGroup from '../../models/chat-group';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import Tenant from '../../models/tenant';
import User from '../../models/user';
import { mongoId, prob, randomItems, shuffle } from '../../utils/helper';
import { fakeChatsWithContents } from '../helper';

const { CHAT_GROUP, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param chatGroupCount: number of chatGroups (per user per tenant)
 * @param chatMax: max chats (per chatGroup)
 * @param contentMax: max contents(per chat)
 */
const fake = async (codes: string[], chatGroupCount = 5, chatMax = 5, contentMax = 6): Promise<string> => {
  const [users, { adminIds }, tenants] = await Promise.all([
    User.find({ status: USER.STATUS.ACTIVE }).lean(),
    User.findSystemAccountIds(),
    Tenant.find({
      services: TENANT.SERVICE.CHAT_GROUP,
      ...(codes.length && { code: { $in: codes } }),
      deletedAt: { $exists: false },
    }).lean(),
  ]);
  if (!adminIds.length) throw new Error('User Collection has ADMIN user');

  const chats: ChatDocument[] = [];
  const contents: ContentDocument[] = [];

  // Part 1: generate one (toAdmin) chat per activeUser
  const adminMessages = users.sort(shuffle).map(user => {
    const chatGroupId = mongoId();
    const { chats: newChats, contents: newContents } = fakeChatsWithContents(
      `/chatGroups/${chatGroupId}`,
      [user._id],
      1,
      1,
      false,
    );

    chats.push(...newChats);
    contents.push(...newContents);

    return new ChatGroup<Partial<ChatGroupDocument>>({
      _id: chatGroupId,
      key: `USER#${user._id}`,
      flags: [CHAT_GROUP.FLAG.ADMIN],
      title: `USER#${user._id}`,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: adminIds,
      users: [user._id, ...adminIds],
      chats: newChats.map(c => c._id),
    });
  });

  // Part 2: generate normal chatGroups (per tenants)
  const chatGroups = tenants
    .map(tenant =>
      users
        .sort(shuffle)
        .filter(u => u.tenants.some(t => t.equals(tenant._id))) // filter same tenantId
        .map((user, idx) =>
          Array(Math.ceil(Math.random() * chatGroupCount))
            .fill(0)
            .map(() => {
              {
                // find (up to 6) other users (excluding himself, but in the same tenantId)
                const otherUsers = randomItems(users.slice(idx + 1), 6);

                const chatGroupId = mongoId();
                const { chats: newChats, contents: newContents } = fakeChatsWithContents(
                  `/chatGroups/${chatGroupId}`,
                  [user, ...otherUsers].map(u => u._id),
                  chatMax,
                  contentMax,
                  true, // recallable contents
                );

                chats.push(...newChats);
                contents.push(...newContents);

                return new ChatGroup<Partial<ChatGroupDocument>>({
                  _id: chatGroupId,
                  tenant: tenant._id,
                  membership: prob(0.5)
                    ? CHAT_GROUP.MEMBERSHIP.NORMAL
                    : prob(0.5)
                    ? CHAT_GROUP.MEMBERSHIP.CLOSED
                    : CHAT_GROUP.MEMBERSHIP.PUBLIC,
                  ...(prob(0.8) && { title: `chatGroup-title : ${faker.lorem.slug(5)}` }),
                  ...(prob(0.5) && { description: `chatGroup-desc : ${faker.lorem.sentences(5)}` }),
                  users: [user, ...otherUsers].map(u => u._id),
                  admins: [user._id],
                  chats: newChats.map(u => u._id),
                  createdAt: new Date(Math.min(...newChats.map(t => t.createdAt.getTime()))),
                  ...(prob(0.5) && { logoUrl: faker.internet.avatar() }),
                });
              }
            }),
        )
        .flat(),
    )
    .flat();

  await Promise.all([
    ChatGroup.insertMany<Partial<ChatGroupDocument>>([...adminMessages, ...chatGroups], { rawResult: true }),
    Chat.insertMany<Partial<ChatDocument>>(chats, { rawResult: true }),
    Content.insertMany<Partial<ContentDocument>>(contents, { rawResult: true }),
  ]);

  const adminMsg = `${chalk.green(adminMessages.length)} adminMessages`;
  const msg = `${chalk.green(chatGroups.length)} chatGroups created for ${chalk.green(users.length)} users`;
  const chatMsg = `${chalk.green(chats.length)} chats, ${chalk.green(contents.length)} contents)`;
  return `(${adminMsg}, ${msg} ${chalk.green(tenants.length)} tenants with ${chatMsg})`;
};

export { fake };
