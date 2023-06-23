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
import type { ChatGroupDocument, Id } from '../../models/chat-group';
import ChatGroup from '../../models/chat-group';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import Tenant from '../../models/tenant';
import User from '../../models/user';
import { messageToAdmin } from '../../utils/chat';
import { idsToString, mongoId, prob, shuffle } from '../../utils/helper';
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

  // Part 1: generate one (toAdmin) chat per activeUser
  const adminMessages = users.sort(shuffle).map(async user =>
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
  );

  // Part 2: generate normal (among normal user) contents
  const chats: ChatDocument[] = [];
  const contents: ContentDocument[] = [];

  const chatGroups = tenants
    .map(tenant =>
      users
        .sort(shuffle)
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

                const chatGroupId = mongoId();
                const { chats: newChats, contents: newContents } = fakeChatsWithContents(
                  'chatGroups',
                  chatGroupId,
                  idsToString([user, ...otherUsers]),
                  chatMax,
                  contentMax,
                  true, // recallable contents
                );

                chats.push(...newChats);
                contents.push(...newContents);

                return new ChatGroup<Partial<ChatGroupDocument & Id>>({
                  _id: chatGroupId,
                  tenant: tenant._id.toString(),
                  membership: prob(0.5)
                    ? CHAT_GROUP.MEMBERSHIP.NORMAL
                    : prob(0.5)
                    ? CHAT_GROUP.MEMBERSHIP.CLOSED
                    : CHAT_GROUP.MEMBERSHIP.PUBLIC,
                  ...(prob(0.8) && { title: `chatGroup-title : ${faker.lorem.slug(5)}` }),
                  ...(prob(0.5) && { description: `chatGroup-desc : ${faker.lorem.sentences(5)}` }),
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

  await Promise.all([...adminMessages, ChatGroup.create(chatGroups), Chat.create(chats), Content.create(contents)]);

  const adminMsg = `${chalk.green(adminMessages.length)} adminMessages`;
  const msg = `${chalk.green(chatGroups.length)} chatGroups created for ${chalk.green(users.length)} users`;
  const chatMsg = `with ${chalk.green(chats.length)} chats, ${chalk.green(contents.length)} contents)`;
  return `(${adminMsg}, ${msg} [for ${tenants.length} tenant(s)] with ${chatMsg})`;
};

export { fake };
