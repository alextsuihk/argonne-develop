/**
 * Jest: /resolvers/chat-groups
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  apolloExpect,
  ApolloServer,
  expectedIdFormat,
  FAKE,
  FAKE2,
  idsToString,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
  testServer,
} from '../jest';
import ChatGroup from '../models/chat-group';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_CHAT_GROUP,
  ADD_CHAT_GROUP_ADMINS,
  ADD_CHAT_GROUP_USERS,
  GET_CHAT_GROUP,
  GET_CHAT_GROUPS,
  JOIN_CHAT_GROUP,
  LEAVE_CHAT_GROUP,
  REMOVE_CHAT_GROUP_USERS,
  TO_ADMIN_CHAT_GROUP,
  TO_ALEX_CHAT_GROUP,
  TO_TENANT_ADMINS_CHAT_GROUP,
  UPDATE_CHAT_GROUP,
} from '../queries/chat-group';

const { MSG_ENUM } = LOCALE;
const { CHAT_GROUP } = LOCALE.DB_ENUM;

// Top chat of this test suite:
describe('ChatGroup GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: LeanDocument<UserDocument> | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUser: LeanDocument<UserDocument> | null;
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let tenantId: string | null;
  let url: string;
  let url2: string;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    tenant: expect.toBeOneOf([null, expect.any(String)]),
    title: expect.toBeOneOf([null, expect.any(String)]),
    description: expect.toBeOneOf([null, expect.any(String)]),

    membership: expect.toBeOneOf(Object.keys(CHAT_GROUP.MEMBERSHIP)),
    admins: expect.any(Array), // adminMessages don't have admins initially
    users: expect.arrayContaining([expect.any(String)]),
    chats: expect.any(Array),

    adminKey: expect.toBeOneOf([null, expect.any(String)]),
    key: expect.toBeOneOf([null, expect.any(String)]),
    url: expect.toBeOneOf([null, expect.any(String)]),
    logoUrl: expect.toBeOneOf([null, expect.any(String)]),

    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  };

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer, normalUser, normalUsers, tenantId } = await jestSetup(
      ['admin', 'guest', 'normal'],
      { apollo: true },
    ));
  });

  afterAll(async () => Promise.all([url && jestRemoveObject(url), url2 && jestRemoveObject(url2), jestTeardown()]));

  test('should response an array of data when GET all (as adminUser)', async () => {
    expect.assertions(2);

    const res = await adminServer!.executeOperation({ query: GET_CHAT_GROUPS });
    apolloExpect(res, 'data', { chatGroups: expect.arrayContaining([expectedNormalFormat]) });
    expect(
      res.data?.chatGroups.some(
        chatGroup => chatGroup.adminKey && !idsToString(chatGroup.users).includes(adminUser!._id.toString()),
      ),
    ).toBeTrue();
  });

  test('should response a single object when GET One (adminMessage) by ID (as adminUser)', async () => {
    expect.assertions(1);

    const chatGroups = await ChatGroup.find({ adminKey: { $exists: true }, deletedAt: { $exists: false } }).lean();
    if (!chatGroups.length) throw 'There is no admin message chatGroup';

    const res = await adminServer!.executeOperation({
      query: GET_CHAT_GROUP,
      variables: { id: randomId(chatGroups) },
    });
    apolloExpect(res, 'data', { chatGroup: { ...expectedNormalFormat, adminKey: expect.any(String) } });
  });

  test('should response an array of data when GET all (as normalUser)', async () => {
    expect.assertions(1);

    const res = await normalServer!.executeOperation({ query: GET_CHAT_GROUPS });
    apolloExpect(res, 'data', { chatGroups: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID (as normalUser)', async () => {
    expect.assertions(1);

    const chatGroups = await ChatGroup.find({ users: normalUser!, deletedAt: { $exists: false } }).lean();
    const res = await normalServer!.executeOperation({
      query: GET_CHAT_GROUP,
      variables: { id: randomId(chatGroups) },
    });
    apolloExpect(res, 'data', { chatGroup: expectedNormalFormat });
  });

  test('should fail when GET all (as guest)', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_CHAT_GROUPS });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET One by ID (as guest)', async () => {
    expect.assertions(1);

    const chatGroup = await ChatGroup.findOne().lean();
    const res = await guestServer!.executeOperation({
      query: GET_CHAT_GROUP,
      variables: { id: chatGroup!._id.toString() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_CHAT_GROUP });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_CHAT_GROUP, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should pass when post two message toAdmin', async () => {
    expect.assertions(2);

    // create a new user without any admin-message
    const user = await User.create({ tenants: [tenantId], name: `name-${FAKE}` });
    const userId = user._id.toString();
    const userServer = testServer(user);

    const expectedNormalFormatEx = {
      ...expectedNormalFormat,
      tenant: null,
      title: `USER#${userId} (name-${FAKE})`,
      description: null,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: [userId],
      adminKey: `USER#${userId}`,
      key: null,
      url: null,
      logoUrl: null,
    };

    const adminMsgRes1 = await userServer.executeOperation({
      query: TO_ADMIN_CHAT_GROUP,
      variables: { content: FAKE },
    });
    apolloExpect(adminMsgRes1, 'data', {
      toAdminChatGroup: { ...expectedNormalFormatEx, chats: [expect.any(String)] },
    });

    const adminMsgRes2 = await userServer.executeOperation({
      query: TO_ADMIN_CHAT_GROUP,
      variables: { content: FAKE },
    });
    apolloExpect(adminMsgRes2, 'data', {
      toAdminChatGroup: { ...expectedNormalFormatEx, chats: [expect.any(String), expect.any(String)] },
    });

    // clean up
    await User.deleteOne({ _id: user });
  });

  test('should pass when post two message toAlex', async () => {
    expect.assertions(2);

    // create a brand new user without previous messages with Alex
    const [{ alexId }, user] = await Promise.all([
      User.findSystemAccountIds(),
      User.create({ tenants: [tenantId], name: `name-${FAKE}` }),
    ]);
    const userId = user._id.toString();
    const userServer = testServer(user);

    const expectedNormalFormatEx = {
      ...expectedNormalFormat,
      tenant: null,
      title: null,
      description: null,
      membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
      admins: [],
      users: [userId, alexId],
      adminKey: null,
      key: `ALEX#USER#${userId}`,
      url: null,
      logoUrl: null,
    };

    const adminMsgRes1 = await userServer.executeOperation({
      query: TO_ALEX_CHAT_GROUP,
      variables: { content: FAKE },
    });
    apolloExpect(adminMsgRes1, 'data', {
      toAlexChatGroup: { ...expectedNormalFormatEx, chats: [expect.any(String)] },
    });

    const adminMsgRes2 = await userServer.executeOperation({
      query: TO_ALEX_CHAT_GROUP,
      variables: { content: FAKE },
    });
    apolloExpect(adminMsgRes2, 'data', {
      toAlexChatGroup: { ...expectedNormalFormatEx, chats: [expect.any(String), expect.any(String)] },
    });

    // clean up
    await User.deleteOne({ _id: user });
  });

  test('should pass when post two message toTenantAdmin', async () => {
    expect.assertions(2);

    const [tenant, user] = await Promise.all([
      Tenant.findByTenantId(tenantId!),
      User.create({ tenants: [tenantId], name: `name-${FAKE}` }),
    ]);
    const userId = user._id.toString();
    const userServer = testServer(user);

    const expectedNormalFormatEx = {
      ...expectedNormalFormat,
      tenant: null,
      title: null,
      description: null,
      membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
      admins: [],
      users: [userId, ...idsToString(tenant!.admins)],
      adminKey: null,
      key: `TENANT#${tenantId}-USER#${userId}`,
      url: null,
      logoUrl: null,
    };

    const adminMsgRes1 = await userServer.executeOperation({
      query: TO_TENANT_ADMINS_CHAT_GROUP,
      variables: { tenantId: tenantId!, content: FAKE },
    });
    apolloExpect(adminMsgRes1, 'data', {
      toTenantAdminsChatGroup: { ...expectedNormalFormatEx, chats: [expect.any(String)] },
    });

    const adminMsgRes2 = await userServer.executeOperation({
      query: TO_TENANT_ADMINS_CHAT_GROUP,
      variables: { tenantId: tenantId!, content: FAKE },
    });
    apolloExpect(adminMsgRes2, 'data', {
      toTenantAdminsChatGroup: { ...expectedNormalFormatEx, chats: [expect.any(String), expect.any(String)] },
    });

    // clean up
    await User.deleteOne({ _id: user });
  });

  test('should fail when creating chatGroup (when user is not identifiedAt)', async () => {
    expect.assertions(1);

    // create a new user (without identifiedAt)
    const user = await User.create({ tenants: [tenantId!], name: `tutor-${FAKE}` });

    const [user0Id] = idsToString(normalUsers!);
    const res = await testServer(user).executeOperation({
      query: ADD_CHAT_GROUP,
      variables: { tenantId: tenantId!, userIds: [user0Id], membership: CHAT_GROUP.MEMBERSHIP.CLOSED },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass the full suite', async () => {
    expect.assertions(14);

    const [, , , user2, , join] = normalUsers!;
    const [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] = idsToString(normalUsers!);
    const ownerServer = normalServer!;

    [url, url2] = await Promise.all([jestPutObject(normalUser!), jestPutObject(normalUser!)]);

    const create = {
      ...(prob(0.5) && { title: FAKE }),
      ...(prob(0.5) && { description: FAKE }),
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      ...(prob(0.5) && { logoUrl: url }),
    };

    // (owner) add ChatGroup
    const createdRes = await ownerServer.executeOperation({
      query: ADD_CHAT_GROUP,
      variables: { tenantId: tenantId!, userIds: [user0Id], ...create },
    });
    apolloExpect(createdRes, 'data', {
      addChatGroup: {
        ...expectedNormalFormat,
        ...create,
        tenant: tenantId!,
        admins: [ownerId],
        users: [ownerId, user0Id],
      },
    });
    const newId: string = createdRes.data!.addChatGroup._id;

    // (owner) add 2 users
    const addUsersRes = await ownerServer.executeOperation({
      query: ADD_CHAT_GROUP_USERS,
      variables: { id: newId, userIds: [user1Id, user2Id] },
    });
    apolloExpect(addUsersRes, 'data', {
      addChatGroupUsers: { ...expectedNormalFormat, users: [ownerId, user0Id, user1Id, user2Id] },
    });

    // (owner) promote 1 user to admin
    const addAdminsRes = await ownerServer.executeOperation({
      query: ADD_CHAT_GROUP_ADMINS,
      variables: { id: newId, userIds: [user1Id] },
    });
    apolloExpect(addAdminsRes, 'data', {
      addChatGroupAdmins: { ...expectedNormalFormat, admins: [ownerId, user1Id] },
    });

    // (joinUser) should fail when joining CLOSED membership
    const joinServer = testServer(join);
    const joinFailRes = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    apolloExpect(joinFailRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // (user2) for CLOSED-MEMBERSHIP, should fail when regular user (user2) tries to addUsers
    const user2Server = testServer(user2);
    const addUsersFailRes = await user2Server.executeOperation({
      query: ADD_CHAT_GROUP_USERS,
      variables: { id: newId, userIds: [user3Id] },
    });
    apolloExpect(addUsersFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // (owner) change to NORMAL-MEMBERSHIP & remove logoUrl
    const updatedRes = await ownerServer.executeOperation({
      query: UPDATE_CHAT_GROUP,
      variables: { id: newId, title: FAKE2, description: FAKE2, membership: CHAT_GROUP.MEMBERSHIP.NORMAL, logoUrl: '' },
    });
    apolloExpect(updatedRes, 'data', {
      updateChatGroup: {
        ...expectedNormalFormat,
        title: FAKE2,
        description: FAKE2,
        membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
        logoUrl: null, // logoUrl is removed
      },
    });

    // (user2) for NORMAL-MEMBERSHIP, any existing user could add new users
    const addUsers2Res = await user2Server.executeOperation({
      query: ADD_CHAT_GROUP_USERS,
      variables: { id: newId, userIds: [user3Id] },
    });
    apolloExpect(addUsers2Res, 'data', {
      addChatGroupUsers: { ...expectedNormalFormat, users: [ownerId, user0Id, user1Id, user2Id, user3Id] },
    });

    // (joinUser) should fail when joining NORMAL membership
    const joinFail2Res = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    apolloExpect(joinFail2Res, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // (owner) change to PUBLIC-MEMBERSHIP & add logoUrl back
    const updated2Res = await ownerServer.executeOperation({
      query: UPDATE_CHAT_GROUP,
      variables: { id: newId, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2 },
    });
    apolloExpect(updated2Res, 'data', {
      updateChatGroup: { ...expectedNormalFormat, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2 },
    });

    // (joinUser) should pass when joining a PUBLIC-MEMBERSHIP
    const joinRes = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    apolloExpect(joinRes, 'data', {
      joinChatGroup: { ...expectedNormalFormat, users: [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] },
    });

    // (user2) should pass when user2 leaving chatGroup
    const leaveRes = await user2Server.executeOperation({ query: LEAVE_CHAT_GROUP, variables: { id: newId } });
    apolloExpect(leaveRes, 'data', { leaveChatGroup: { code: MSG_ENUM.COMPLETED } });

    // (joinUser ) normalUser should fail to removeUsers
    const removeUsersFailRes = await joinServer.executeOperation({
      query: REMOVE_CHAT_GROUP_USERS,
      variables: { id: newId, userIds: [user3Id] },
    });
    apolloExpect(removeUsersFailRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // (owner ) should pass when chatGroup.admin removes users
    const removeUsersRes = await ownerServer.executeOperation({
      query: REMOVE_CHAT_GROUP_USERS,
      variables: { id: newId, userIds: [user1Id, user3Id] },
    });
    apolloExpect(removeUsersRes, 'data', {
      removeChatGroupUsers: { ...expectedNormalFormat, admins: [ownerId], users: [ownerId, user0Id, joinId] },
    });

    // (owner ) should pass when chatGroup.admin re-add user
    const reAddUsersRes = await ownerServer.executeOperation({
      query: ADD_CHAT_GROUP_USERS,
      variables: { id: newId, userIds: [user1Id] },
    });
    apolloExpect(reAddUsersRes, 'data', {
      addChatGroupUsers: { ...expectedNormalFormat, admins: [ownerId], users: [ownerId, user0Id, joinId, user1Id] },
    });
  });
});
