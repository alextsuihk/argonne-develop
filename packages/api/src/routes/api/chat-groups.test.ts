/**
 * JEST Test: /api/chat-groups routes
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  expectedIdFormat,
  FAKE,
  FAKE2,
  idsToString,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
} from '../../jest';
import type { ChatGroupDocument } from '../../models/chat-group';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany, getUnauthenticated } = commonTest;
const { MSG_ENUM } = LOCALE;
const { CHAT_GROUP } = LOCALE.DB_ENUM;

const route = 'chat-groups';

// expected MINIMUM single district format
export const expectedMinFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),
  // tenant: expect.any(String),
  // title: expect.any(String),
  // description: expect.any(String),
  membership: expect.toBeOneOf(Object.keys(CHAT_GROUP.MEMBERSHIP)),
  admins: expect.any(Array), // adminMessages don't have admins initially
  users: expect.arrayContaining([expect.any(String)]),
  chats: expect.any(Array),
  // adminKey: expect.any(String),
  // key: expect.any(String),
  // url: expect.any(String),
  // logoUrl: expect.any(String),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUser: LeanDocument<UserDocument> | null;
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let tenantId: string | null;
  let url: string;
  let url2: string;

  beforeAll(async () => {
    ({ normalUser, normalUsers, tenantId } = await jestSetup(['normal']));
  });
  afterAll(async () => Promise.all([url && jestRemoveObject(url), url2 && jestRemoveObject(url2), jestTeardown()]));

  test('should pass when getMany & getById', async () =>
    getMany(route, { 'Jest-User': normalUser!._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should fail when GET many without authenticated', async () => getUnauthenticated(route, {}));

  test('should fail when GET one without authenticated', async () =>
    getUnauthenticated(`${route}/${normalUser!._id}`, {}));

  test('should pass when post two messages toAdmin', async () => {
    // create a new user without any admin-message
    const { _id: userId } = await User.create({ tenants: [tenantId], name: `name-${FAKE}` });

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      title: `USER#${userId} (name-${FAKE})`,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: [userId.toString()],
      adminKey: `USER#${userId}`,
    };

    await createUpdateDelete<ChatGroupDocument>(route, { 'Jest-User': userId }, [
      {
        action: 'create#toAdmin',
        data: { content: FAKE },
        expectedMinFormat: { ...expectedMinFormatEx, chats: [expect.any(String)] },
      },
      {
        action: 'create#toAdmin',
        data: { content: FAKE2 },
        expectedMinFormat: { ...expectedMinFormatEx, chats: [expect.any(String), expect.any(String)] },
      },
    ]);

    // clean up
    await User.deleteOne({ _id: userId });
  });

  test('should pass when post two messages toAlex', async () => {
    // create a brand new user without previous messages with Alex
    const [{ alexId }, { _id: userId }] = await Promise.all([
      User.findSystemAccountIds(),
      User.create({ tenants: [tenantId], name: `name-${FAKE}` }),
    ]);

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
      admins: [],
      users: [userId.toString(), alexId],
      key: `ALEX#USER#${userId}`,
    };

    await createUpdateDelete<ChatGroupDocument>(route, { 'Jest-User': userId }, [
      {
        action: 'create#toAlex',
        data: { content: FAKE },
        expectedMinFormat: { ...expectedMinFormatEx, chats: [expect.any(String)] },
      },
      {
        action: 'create#toAlex',
        data: { content: FAKE2 },
        expectedMinFormat: { ...expectedMinFormatEx, chats: [expect.any(String), expect.any(String)] },
      },
    ]);

    // clean up
    await User.deleteOne({ _id: userId });
  });

  test('should pass when post two messages toTenantAdmins', async () => {
    const [tenant, { _id: userId }] = await Promise.all([
      Tenant.findByTenantId(tenantId!),
      User.create({ tenants: [tenantId], name: `name-${FAKE}` }),
    ]);

    const expectedMinFormatEx = {
      ...expectedMinFormat,
      membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
      admins: [],
      users: [userId.toString(), ...idsToString(tenant!.admins)],
      key: `TENANT#${tenantId}-USER#${userId}`,
    };

    await createUpdateDelete<ChatGroupDocument>(route, { 'Jest-User': userId }, [
      {
        action: 'create#toTenantAdmins',
        data: { tenantId, content: FAKE },
        expectedMinFormat: { ...expectedMinFormatEx, chats: [expect.any(String)] },
      },
      {
        action: 'create#toTenantAdmins',
        data: { tenantId, content: FAKE2 },
        expectedMinFormat: { ...expectedMinFormatEx, chats: [expect.any(String), expect.any(String)] },
      },
    ]);

    // clean up
    await User.deleteOne({ _id: userId });
  });

  test('should fail when creating chatGroup (user without identifiedAt)', async () => {
    expect.assertions(3);

    // create a new user (without identifiedAt)
    const user = await User.create({ tenants: [tenantId!], name: `tutor-${FAKE}` });

    await createUpdateDelete(route, { 'Jest-User': user._id }, [
      {
        action: 'create', // tenantAdmin creates (add) new tutor
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
    await User.deleteOne({ _id: user._id });
  });

  test('should pass the full suite', async () => {
    const [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] = idsToString(normalUsers!);

    [url, url2] = await Promise.all([jestPutObject(ownerId), jestPutObject(ownerId)]);

    const create = {
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      ...(prob(0.5) && { title: FAKE }),
      ...(prob(0.5) && { description: FAKE }),
      ...(prob(0.5) && { logoUrl: url }),
    };

    const update = { title: FAKE2, description: FAKE2, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2 };

    await createUpdateDelete<ChatGroupDocument>(route, { 'Jest-User': ownerId }, [
      {
        action: 'create',
        data: { tenantId: tenantId!, userIds: [user0Id], ...create },
        expectedMinFormat: {
          ...expectedMinFormat,
          ...create,
          tenant: tenantId!,
          admins: [ownerId],
          users: [ownerId, user0Id],
        },
      },
      {
        action: 'addUsers', // even for CLOSED-MEMBERSHIP, chatGroup.admins could add users
        data: { userIds: [user1Id, user2Id] },
        expectedMinFormat: { ...expectedMinFormat, users: [ownerId, user0Id, user1Id, user2Id] },
      },
      {
        action: 'addAdmins', // promote two users to admins
        data: { userIds: [user1Id] },
        expectedMinFormat: { ...expectedMinFormat, admins: [ownerId, user1Id] },
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
        action: 'addUsers', // for CLOSED-MEMBERSHIP, should fail when regular user (user2) tries to addUsers
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
        },
      },
      {
        action: 'addUsers', // for NORMAL-MEMBERSHIP, any existing user could add new users
        headers: { 'Jest-User': user2Id },
        data: { userIds: [user3Id] },
        expectedMinFormat: { ...expectedMinFormat, users: [ownerId, user0Id, user1Id, user2Id, user3Id] },
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
        expectedMinFormat: { ...expectedMinFormat, ...update },
      },
      {
        action: 'join', // should pass when joining a PUBLIC-MEMBERSHIP
        headers: { 'Jest-User': joinId },
        data: {},
        expectedMinFormat: { ...expectedMinFormat, users: [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] },
      },
      {
        action: 'leave', // should pass when user2 leaving chatGroup
        headers: { 'Jest-User': user2Id },
        data: {},
        expectedResponse: { statusCode: 200, data: { code: MSG_ENUM.COMPLETED } },
      },
      {
        action: 'removeUsers', // normalUser should fail to removeUsers
        headers: { 'Jest-User': joinId },
        data: { userIds: [user3Id] },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
        },
      },
      {
        action: 'removeUsers', // should pass when chatGroup.admin removes users
        data: { userIds: [user1Id, user2Id] },
        expectedMinFormat: { ...expectedMinFormat, admins: [ownerId], users: [ownerId, user0Id, user3Id, joinId] },
      },
    ]);
  });
});
