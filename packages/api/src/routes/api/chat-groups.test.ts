/**
 * JEST Test: /api/chat-groups routes
 *
 */

import { LOCALE } from '@argonne/common';

import {
  expectedChatFormat,
  expectedDateFormat,
  expectedIdFormat,
  expectedMember,
  FAKE,
  FAKE2,
  genChatGroup,
  genQuestion,
  genUser,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
} from '../../jest';
import Book from '../../models/book';
import type { ChatDocument } from '../../models/chat';
import type { ChatGroupDocument, Id } from '../../models/chat-group';
import ChatGroup from '../../models/chat-group';
import Level from '../../models/level';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { createUpdateDelete, getById, getMany, getUnauthenticated } = commonTest;
const { MSG_ENUM } = LOCALE;
const { CHAT, CHAT_GROUP } = LOCALE.DB_ENUM;

const route = 'chat-groups';

// expected MINIMUM single district format
export const expectedMinFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),
  // tenant: expectedIdFormat,
  // title: expect.any(String),
  // description: expect.any(String),
  membership: expect.toBeOneOf(Object.keys(CHAT_GROUP.MEMBERSHIP)),
  admins: expect.arrayContaining([expectedIdFormat]),
  users: expect.arrayContaining([expectedIdFormat]),
  marshals: expect.any(Array),
  chats: expect.arrayContaining([expect.objectContaining(expectedChatFormat)]),
  // key: expect.any(String),
  // url: expect.any(String),
  // logoUrl: expect.any(String),
  createdAt: expectedDateFormat(),
  updatedAt: expectedDateFormat(),

  contentsToken: expect.any(String),
};

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let adminUser: (UserDocument & Id) | null;
  let normalUser: (UserDocument & Id) | null;
  let normalUsers: (UserDocument & Id)[] | null;
  let tenantId: string | null;
  let url: string | undefined;
  let url2: string | undefined;

  beforeAll(async () => {
    ({ adminUser, normalUser, normalUsers, tenantId } = await jestSetup(['admin', 'normal']));
  });
  afterAll(async () => Promise.all([url && jestRemoveObject(url), url2 && jestRemoveObject(url2), jestTeardown()]));

  test('should response an array of data when getMany & getById (as adminUser)', async () => {
    const chatGroups = await ChatGroup.find({
      users: adminUser!._id,
      key: { $exists: true },
      flags: CHAT_GROUP.FLAG.ADMIN,
      deletedAt: { $exists: false },
    }).lean();
    if (!chatGroups.length) throw 'There is no admin message chatGroup';

    const id = randomItem(chatGroups)._id.toString();
    await getById(route, { 'Jest-User': adminUser!._id }, { ...expectedMinFormat, key: expect.any(String) }, { id });
  });

  test('should pass when getMany & getById', async () =>
    getMany(route, { 'Jest-User': normalUser!._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should fail when GET many without authenticated', async () => getUnauthenticated(route, {}));

  test('should fail when GET one without authenticated', async () =>
    getUnauthenticated(`${route}/${normalUser!._id}`, {}));

  test('should pass when joining a book chatGroup (as teacher)', async () => {
    const [books, teacherLevel] = await Promise.all([
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const teacher = normalUsers!.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw 'No teacher is found';

    await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': teacher._id },
      [
        {
          action: 'joinBook',
          data: {},
          expectedMinFormat: { ...expectedMinFormat, admins: [], chats: expect.any(Array) }, // bookChatGroups have NO admins
        },
      ],
      { overrideId: randomItem(books).chatGroup.toString() },
    );
  });

  test('should fail when joining a book chatGroup (as non-teacher)', async () => {
    const [bookChatGroups, teacherLevel] = await Promise.all([
      ChatGroup.find({ flags: { $ne: CHAT_GROUP.FLAG.BOOK }, deletedAt: { $exists: false } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const nonTeacher = normalUsers!.find(({ schoolHistories }) => !schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!nonTeacher) throw 'No valid non-teacher available for testing';

    await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': nonTeacher._id },
      [
        {
          action: 'joinBook',
          data: {},
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
          },
        },
      ],
      { overrideId: randomItem(bookChatGroups)._id.toString() },
    );
  });

  test('should pass when post two messages toAdmin', async () => {
    // create a new user without any admin-message
    const user = genUser(tenantId!);
    await user.save();

    const { adminIds } = await User.findSystemAccountIds();

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      key: `USER#${user._id}`,
      title: expect.any(String),
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: adminIds.map(a => a.toString()),
      users: [...adminIds, user._id].map(u => u.toString()),
    };

    await createUpdateDelete<ChatGroupDocument & Id>(route, { 'Jest-User': user._id }, [
      {
        action: 'create#toAdmin',
        data: { content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(user._id, [])] })],
        },
      },
      {
        action: 'create#toAdmin',
        data: { content: FAKE2 },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [
            expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(user._id, [])] }),
            expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(user._id, [])] }),
          ],
        },
      },
    ]);

    // clean up
    await user.deleteOne();
  });

  test('should pass when post two messages toAlex', async () => {
    // create a brand new user without previous messages with Alex
    const user = genUser(tenantId!);
    const [{ alexId }] = await Promise.all([User.findSystemAccountIds(), user.save()]);
    const userId = user._id.toString();

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: alexId ? [userId, alexId.toString()] : [userId],
      key: `ALEX#USER#${userId}`,
    };

    await createUpdateDelete<ChatGroupDocument & Id>(route, { 'Jest-User': userId }, [
      {
        action: 'create#toAlex',
        data: { content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(userId, [])] })],
        },
      },
      {
        action: 'create#toAlex',
        data: { content: FAKE2 },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [
            expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(userId, [])] }),
            expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(userId, [])] }),
          ],
        },
      },
    ]);

    // clean up
    await user.deleteOne();
  });

  const messageToTenantAdmins = async (to: 'toTenantAdmins' | 'toTenantCounselors' | 'toTenantSupports') => {
    const user = genUser(tenantId!);
    const [tenant] = await Promise.all([Tenant.findByTenantId(tenantId!), user.save()]);

    const users =
      to === 'toTenantAdmins' ? tenant!.admins : to === 'toTenantCounselors' ? tenant!.counselors : tenant!.supports;

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      flags: [`TENANT_${to.replace('toTenant', '').toUpperCase()}`],
      tenant: tenantId!,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: [user._id, ...users].map(u => u.toString()),
      key: `TENANT#${tenantId}-USER#${user._id} (${to.replace('toTenant', '').toLowerCase()})`,
    };

    await createUpdateDelete<ChatGroupDocument & Id>(route, { 'Jest-User': user._id }, [
      {
        action: `create#${to}`,
        data: { tenantId, content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(user._id, [])] })],
        },
      },
      {
        action: `create#${to}`,
        data: { tenantId, content: FAKE2 },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [
            expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(user._id, [])] }),
            expect.objectContaining({ ...expectedChatFormat, members: [expectedMember(user._id, [])] }),
          ],
        },
      },
    ]);

    // clean up
    await user.deleteOne();
  };

  test('should pass when post two message toTenantAdmin', async () => messageToTenantAdmins('toTenantAdmins'));
  test('should pass when post two message toTenantCounselors', async () => messageToTenantAdmins('toTenantCounselors'));
  test('should pass when post two message toTenantSupports', async () => messageToTenantAdmins('toTenantSupports'));

  test('should fail when creating chatGroup (user without identifiedAt)', async () => {
    expect.assertions(3);

    // create a new user (without identifiedAt)
    const user = genUser(tenantId!);
    await user.save();

    await createUpdateDelete(route, { 'Jest-User': user._id }, [
      {
        action: 'create',
        data: {
          tenantId: tenantId!,
          userIds: normalUsers!.splice(-2).map(u => u._id.toString()),
          membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
        },
        expectedResponse: {
          statusCode: 403,
          data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
        },
      },
    ]);

    // clean-up
    await user.deleteOne();
  });

  test('should pass when attaching chat from another chatGroup', async () => {
    const userId = normalUser!._id.toString();

    const { chatGroup } = genChatGroup(tenantId!, normalUser!._id); // create a destination chatGroup
    const { chatGroup: source, chat, content } = genChatGroup(tenantId!, normalUser!._id); // create source (another) chatGroup
    chatGroup.chats = []; // drop & ignore chats
    await Promise.all([chatGroup.save(), source.save(), chat.save(), content.save()]);

    await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': userId },
      [
        {
          action: 'attachChatGroup',
          data: { chatId: chat._id.toString(), sourceId: source._id.toString() },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                _id: chat._id.toString(),
                contents: [content._id.toString()],
              }),
            ],
          },
        },
      ],
      { overrideId: chatGroup._id.toString() },
    );

    // clean-up (as the documents are only partially formatted)
    await Promise.all([chatGroup.deleteOne(), source.deleteOne()]);
  });

  test('should pass when sharing question to chatGroup', async () => {
    const userId = normalUser!._id.toString();

    const { chatGroup } = genChatGroup(tenantId!, normalUser!._id); // create a destination chatGroup
    const { question, content } = genQuestion(tenantId!, normalUser!._id);
    await Promise.all([chatGroup.save(), question.save(), content.save()]);

    await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': userId },
      [
        {
          action: 'shareQuestion',
          data: { sourceId: question._id.toString() },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat, content._id.toString()] }), // first contentId is auto-gen message
            ],
          },
        },
      ],
      { overrideId: chatGroup._id.toString() },
    );

    // clean-up (as the documents are only partially formatted)
    await Promise.all([chatGroup.deleteOne(), question.deleteOne()]);
  });

  test('should pass the full suite', async () => {
    expect.assertions(3 * 21);

    const [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] = normalUsers!.map(u => u._id.toString());

    [url, url2] = await Promise.all([jestPutObject(ownerId), jestPutObject(ownerId)]);

    const create = {
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      ...(prob(0.5) && { title: FAKE }),
      ...(prob(0.5) && { description: FAKE }),
      ...(prob(0.5) && { logoUrl: url }),
    };

    const update = { title: FAKE2, description: FAKE2, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2 };

    const chatGroup = await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': ownerId },
      [
        {
          action: 'create',
          data: { tenantId: tenantId!, userIds: [user0Id], ...create },
          expectedMinFormat: {
            ...expectedMinFormat,
            ...create,
            tenant: tenantId!,
            admins: [ownerId],
            users: [ownerId, user0Id].sort(),
            chats: [],
          },
        },
        {
          action: 'updateUsers', // even for CLOSED-MEMBERSHIP, chatGroup.admins could update users (remove user0, add user1, user2)
          data: { userIds: [user1Id, user2Id].sort() },
          expectedMinFormat: { ...expectedMinFormat, users: [ownerId, user1Id, user2Id].sort(), chats: [] },
        },
        {
          action: 'updateAdmins', // promote user1 to be admin
          data: { userIds: [user1Id] },
          expectedMinFormat: { ...expectedMinFormat, admins: [ownerId, user1Id].sort(), chats: [] },
        },
        {
          action: 'join', // should fail when joining CLOSED membership
          headers: { 'Jest-User': joinId },
          data: {},
          expectedResponse: {
            statusCode: 422,
            data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
          },
        },
        {
          action: 'updateUsers', // for CLOSED-MEMBERSHIP, should fail when regular user (user2) tries to updateUsers
          headers: { 'Jest-User': user2Id },
          data: { userIds: [user3Id] },
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
          },
        },
        {
          action: 'update',
          data: { title: FAKE2, description: FAKE2, membership: CHAT_GROUP.MEMBERSHIP.NORMAL, logoUrl: '' },
          expectedMinFormat: {
            ...expectedMinFormat,
            title: FAKE2,
            description: FAKE2,
            membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
            chats: [],
          },
        },
        {
          action: 'updateUsers', // for NORMAL-MEMBERSHIP, any existing user could add new users
          headers: { 'Jest-User': user2Id },
          data: { userIds: [ownerId, user0Id, user1Id, user3Id] },
          expectedMinFormat: {
            ...expectedMinFormat,
            users: [user2Id, ownerId, user0Id, user1Id, user3Id].sort(),
            chats: [],
          },
        },
        {
          action: 'join', // should fail when joining NORMAL membership
          headers: { 'Jest-User': joinId },
          data: {},
          expectedResponse: {
            statusCode: 422,
            data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
          },
        },
        {
          action: 'update',
          data: update,
          expectedMinFormat: { ...expectedMinFormat, ...update, chats: [] },
        },
        {
          action: 'join', // should pass when joining a PUBLIC-MEMBERSHIP
          headers: { 'Jest-User': joinId },
          data: {},
          expectedMinFormat: {
            ...expectedMinFormat,
            users: [...[user2Id, ownerId, user0Id, user1Id, user3Id].sort(), joinId], // joinId just appends to the end
            chats: [],
          },
        },
        {
          action: 'leave', // should pass when joinId leaving chatGroup
          headers: { 'Jest-User': joinId },
          data: {},
          expectedResponse: { statusCode: 200, data: { code: MSG_ENUM.COMPLETED } },
        },
        {
          action: 'addContentWithNewChat', // owner addContentWithNewChat
          data: { content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expectedIdFormat],
                members: [expectedMember(ownerId, [])],
              }),
            ],
          },
        },
      ],
      { skipAssertion: true },
    );

    const chatGroupId = chatGroup!._id.toString();
    const chatId = (chatGroup!.chats as (ChatDocument & Id)[])[0]!._id.toString();

    const chatGroup2 = await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': user2Id },
      [
        {
          action: 'addContent',
          data: { chatId, content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] })],
          },
        },
        {
          action: 'addContentWithNewChat',
          data: { content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] }),
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expectedIdFormat],
                members: [expectedMember(user2Id, [])],
              }),
            ],
          },
        },
      ],
      { overrideId: chatGroupId, skipAssertion: true },
    );

    const contentIds = (chatGroup2!.chats[0] as ChatDocument & Id).contents.map(c => c.toString());
    const flag = CHAT.MEMBER.FLAG.IMPORTANT;

    await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': ownerId },
      [
        {
          action: 'recallContent',
          data: { chatId, contentId: contentIds[0] },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] }),
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat] }),
            ],
          },
        },
        {
          action: 'blockContent',
          data: { chatId, contentId: contentIds[1] },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] }),
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat] }),
            ],
          },
        },
        {
          action: 'setChatFlag',
          data: { chatId, flag },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expectedIdFormat, expectedIdFormat],
                members: [expectedMember(ownerId, [flag]), expectedMember(user2Id, [])],
              }),
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat] }),
            ],
          },
        },
        {
          action: 'clearChatFlag',
          data: { chatId, flag },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expectedIdFormat, expectedIdFormat],
                members: [expectedMember(ownerId, []), expectedMember(user2Id, [])],
              }),
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat] }),
            ],
          },
        },
        {
          action: 'updateChatLastViewedAt',
          data: { chatId },
          headers: { 'Jest-User': user2Id },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expectedIdFormat, expectedIdFormat],
                members: [expectedMember(ownerId, []), expectedMember(user2Id, [])],
              }),
              expect.objectContaining({ ...expectedChatFormat, contents: [expectedIdFormat] }),
            ],
          },
        },
        {
          action: 'updateChatTitle', // update chatTitle
          data: { chatId, title: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, title: FAKE }),
              expect.objectContaining(expectedChatFormat),
            ],
          },
        },
        {
          action: 'updateChatTitle', // unset chatTitle
          data: { chatId },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [expect.objectContaining(expectedChatFormat), expect.objectContaining(expectedChatFormat)],
          },
        },
      ],
      { overrideId: chatGroupId, skipAssertion: true },
    );
  });
});
