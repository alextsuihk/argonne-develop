/**
 * JEST Test: /api/chat-groups routes
 *
 */

import { LOCALE } from '@argonne/common';

import {
  expectChatFormat,
  expectedIdFormat,
  expectedMember,
  FAKE,
  FAKE2,
  genChatGroup,
  genQuestion,
  idsToString,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
} from '../../jest';
import type { ChatDocument } from '../../models/chat';
import type { ChatGroupDocument } from '../../models/chat-group';
import ChatGroup from '../../models/chat-group';
import Level from '../../models/level';
import Tenant from '../../models/tenant';
import type { Id, UserDocument } from '../../models/user';
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
  // tenant: expect.any(String),
  // title: expect.any(String),
  // description: expect.any(String),
  membership: expect.toBeOneOf(Object.keys(CHAT_GROUP.MEMBERSHIP)),
  admins: expect.arrayContaining([expect.any(String)]),
  users: expect.arrayContaining([expect.any(String)]),
  marshals: expect.any(Array),
  chats: expect.arrayContaining([expect.objectContaining(expectChatFormat)]),
  // key: expect.any(String),
  // url: expect.any(String),
  // logoUrl: expect.any(String),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),

  contentsToken: expect.any(String),
};

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let adminUser: (UserDocument & Id) | null;
  let normalUser: (UserDocument & Id) | null;
  let normalUsers: (UserDocument & Id)[] | null;
  let tenantId: string | null;
  let url: string;
  let url2: string;

  beforeAll(async () => {
    ({ adminUser, normalUser, normalUsers, tenantId } = await jestSetup(['admin', 'normal']));
  });
  afterAll(async () => Promise.all([url && jestRemoveObject(url), url2 && jestRemoveObject(url2), jestTeardown()]));

  test('should response an array of data when getMany & getById (as adminUser)', async () => {
    const chatGroups = await ChatGroup.find({
      key: { $exists: true },
      flags: CHAT_GROUP.FLAG.ADMIN,
      deletedAt: { $exists: false },
    }).lean();
    if (!chatGroups.length) throw 'There is no admin message chatGroup';

    await getById(
      route,
      { 'Jest-User': adminUser!._id },
      { ...expectedMinFormat, key: expect.any(String) },
      { id: randomId(chatGroups) },
    );
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
    const [bookChatGroups, teacherLevel] = await Promise.all([
      ChatGroup.find({ flags: CHAT_GROUP.FLAG.BOOK }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const teacher = normalUsers!.find(
      ({ schoolHistories }) =>
        schoolHistories[0] && schoolHistories[0].level.toString() === teacherLevel!._id.toString(),
    )!;

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
      { overrideId: randomId(bookChatGroups) },
    );
  });

  test('should fail when joining a book chatGroup (as non-teacher)', async () => {
    const [bookChatGroups, teacherLevel] = await Promise.all([
      ChatGroup.find({ flags: { $ne: CHAT_GROUP.FLAG.BOOK }, deletedAt: { $exists: false } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const nonTeacher = normalUsers!.find(
      ({ schoolHistories }) =>
        schoolHistories[0] && schoolHistories[0].level.toString() !== teacherLevel?._id.toString(),
    );

    await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': nonTeacher!._id },
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
      { overrideId: randomId(bookChatGroups) },
    );
  });

  test('should pass when post two messages toAdmin', async () => {
    // create a new user without any admin-message
    const user = await User.create({ tenants: [tenantId], name: `name-${FAKE}` });
    const userId = user._id.toString();

    const { adminIds } = await User.findSystemAccountIds();

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      key: `USER#${userId}`,
      title: expect.any(String),
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: adminIds,
      users: [...adminIds, userId],
    };

    await createUpdateDelete<ChatGroupDocument & Id>(route, { 'Jest-User': userId }, [
      {
        action: 'create#toAdmin',
        data: { content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) })],
        },
      },
      {
        action: 'create#toAdmin',
        data: { content: FAKE2 },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [
            expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) }),
            expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) }),
          ],
        },
      },
    ]);

    // clean up
    await user.deleteOne();
  });

  test('should pass when post two messages toAlex', async () => {
    // create a brand new user without previous messages with Alex
    const [{ alexId }, user] = await Promise.all([
      User.findSystemAccountIds(),
      User.create({ tenants: [tenantId], name: `name-${FAKE}` }),
    ]);
    const userId = user._id.toString();

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: [userId, alexId],
      key: `ALEX#USER#${userId}`,
    };

    await createUpdateDelete<ChatGroupDocument & Id>(route, { 'Jest-User': userId }, [
      {
        action: 'create#toAlex',
        data: { content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) })],
        },
      },
      {
        action: 'create#toAlex',
        data: { content: FAKE2 },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [
            expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) }),
            expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) }),
          ],
        },
      },
    ]);

    // clean up
    await user.deleteOne();
  });

  const messageToTenantAdmins = async (to: 'toTenantAdmins' | 'toTenantCounselors' | 'toTenantSupports') => {
    const [tenant, user] = await Promise.all([
      Tenant.findByTenantId(tenantId!),
      User.create({ tenants: [tenantId], name: `name-${FAKE}` }),
    ]);

    const userId = user._id.toString();

    const users =
      to === 'toTenantAdmins'
        ? idsToString(tenant!.admins)
        : to === 'toTenantCounselors'
        ? idsToString(tenant!.counselors)
        : idsToString(tenant!.supports);

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      tenant: tenantId!,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: [userId, ...users],
      key: `TENANT#${tenantId}-USER#${userId} (${to.replace('toTenant', '').toLowerCase()})`,
    };

    await createUpdateDelete<ChatGroupDocument & Id>(route, { 'Jest-User': userId }, [
      {
        action: `create#${to}`,
        data: { tenantId, content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) })],
        },
      },
      {
        action: `create#${to}`,
        data: { tenantId, content: FAKE2 },
        expectedMinFormat: {
          ...expectedMinFormatEx,
          chats: [
            expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) }),
            expect.objectContaining({ ...expectChatFormat, ...expectedMember(userId) }),
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
    const user = await User.create({ tenants: [tenantId!], name: `tutor-${FAKE}` });

    await createUpdateDelete(route, { 'Jest-User': user._id }, [
      {
        action: 'create',
        data: {
          tenantId: tenantId!,
          userIds: idsToString(normalUsers!.splice(-2)),
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
                ...expectChatFormat,
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
              expect.objectContaining({ ...expectChatFormat, contents: [expectedIdFormat, content._id.toString()] }), // first contentId is auto-gen message
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

    const [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] = idsToString(normalUsers!);

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
            users: [ownerId, user0Id],
            chats: [],
          },
        },
        {
          action: 'updateUsers', // even for CLOSED-MEMBERSHIP, chatGroup.admins could update users (remove user0, add user1, user2)
          data: { userIds: [user1Id, user2Id] },
          expectedMinFormat: { ...expectedMinFormat, users: [ownerId, user1Id, user2Id], chats: [] },
        },
        {
          action: 'updateAdmins', // promote user1 to be admin
          data: { userIds: [user1Id] },
          expectedMinFormat: { ...expectedMinFormat, admins: [ownerId, user1Id], chats: [] },
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
          expectedMinFormat: { ...expectedMinFormat, users: [user2Id, ownerId, user0Id, user1Id, user3Id], chats: [] },
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
            users: [user2Id, ownerId, user0Id, user1Id, user3Id, joinId],
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
                ...expectChatFormat,
                contents: [expect.any(String)],
                ...expectedMember(ownerId),
              }),
            ],
          },
        },
      ],
      { skipAssertion: true },
    );

    const chatGroupId = chatGroup!._id.toString();
    const [chatId] = idsToString(chatGroup!.chats);

    const chatGroup2 = await createUpdateDelete<ChatGroupDocument & Id>(
      route,
      { 'Jest-User': user2Id },
      [
        {
          action: 'addContent',
          data: { chatId, content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String), expect.any(String)] }),
            ],
          },
        },
        {
          action: 'addContentWithNewChat',
          data: { content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String), expect.any(String)] }),
              expect.objectContaining({
                ...expectChatFormat,
                contents: [expect.any(String)],
                ...expectedMember(user2Id),
              }),
            ],
          },
        },
      ],
      { overrideId: chatGroupId, skipAssertion: true },
    );

    const contentIds = idsToString((chatGroup2!.chats[0] as ChatDocument & Id).contents);
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
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String), expect.any(String)] }),
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String)] }),
            ],
          },
        },
        {
          action: 'blockContent',
          data: { chatId, contentId: contentIds[1] },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String), expect.any(String)] }),
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String)] }),
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
                ...expectChatFormat,
                contents: [expect.any(String), expect.any(String)],
                members: [{ _id: expectedIdFormat, user: ownerId, flags: [flag], lastViewedAt: expect.any(String) }],
              }),
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String)] }),
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
                ...expectChatFormat,
                contents: [expect.any(String), expect.any(String)],
                members: [{ _id: expectedIdFormat, user: ownerId, flags: [], lastViewedAt: expect.any(String) }],
              }),
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String)] }),
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
                ...expectChatFormat,
                contents: [expect.any(String), expect.any(String)],
                members: [
                  { _id: expectedIdFormat, user: ownerId, flags: [], lastViewedAt: expect.any(String) },
                  { _id: expectedIdFormat, user: user2Id, flags: [], lastViewedAt: expect.any(String) },
                ],
              }),
              expect.objectContaining({ ...expectChatFormat, contents: [expect.any(String)] }),
            ],
          },
        },
        {
          action: 'updateChatTitle', // update chatTitle
          data: { chatId, title: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectChatFormat, title: FAKE }),
              expect.objectContaining(expectChatFormat),
            ],
          },
        },
        {
          action: 'updateChatTitle', // unset chatTitle
          data: { chatId },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [expect.objectContaining(expectChatFormat), expect.objectContaining(expectChatFormat)],
          },
        },
      ],
      { overrideId: chatGroupId, skipAssertion: true },
    );
  });
});
