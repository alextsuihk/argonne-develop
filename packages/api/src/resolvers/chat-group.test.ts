/**
 * Jest: /resolvers/chat-groups
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
  expectedChatFormatApollo as expectedChatFormat,
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
  testServer,
} from '../jest';
import Book from '../models/book';
import ChatGroup from '../models/chat-group';
import Level from '../models/level';
import Tenant from '../models/tenant';
import type { Id, UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_CHAT_GROUP,
  ADD_CHAT_GROUP_CONTENT,
  ADD_CHAT_GROUP_CONTENT_WITH_NEW_CHAT,
  ATTACH_CHAT_GROUP_TO_CHAT_GROUP,
  BLOCK_CHAT_GROUP_CONTENT,
  CLEAR_CHAT_GROUP_CHAT_FLAG,
  GET_CHAT_GROUP,
  GET_CHAT_GROUPS,
  JOIN_BOOK_CHAT_GROUP,
  JOIN_CHAT_GROUP,
  LEAVE_CHAT_GROUP,
  RECALL_CHAT_GROUP_CONTENT,
  SET_CHAT_GROUP_CHAT_FLAG,
  SHARE_QUESTION_TO_CHAT_GROUP,
  TO_ADMIN_CHAT_GROUP,
  TO_ALEX_CHAT_GROUP,
  TO_TENANT_ADMINS_CHAT_GROUP,
  TO_TENANT_COUNSELORS_CHAT_GROUP,
  TO_TENANT_SUPPORTS_CHAT_GROUP,
  UPDATE_CHAT_GROUP,
  UPDATE_CHAT_GROUP_ADMINS,
  UPDATE_CHAT_GROUP_CHAT_LAST_VIEWED_AT,
  UPDATE_CHAT_GROUP_CHAT_TITLE,
  UPDATE_CHAT_GROUP_USERS,
} from '../queries/chat-group';

const { MSG_ENUM } = LOCALE;
const { CHAT, CHAT_GROUP } = LOCALE.DB_ENUM;

// Top chat of this test suite:
describe('ChatGroup GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: (UserDocument & Id) | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUser: (UserDocument & Id) | null;
  let normalUsers: (UserDocument & Id)[] | null;
  let tenantId: string | null;
  let url: string | undefined;
  let url2: string | undefined;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    tenant: expect.toBeOneOf([null, expectedIdFormat]),
    title: expect.toBeOneOf([null, expect.any(String)]),
    description: expect.toBeOneOf([null, expect.any(String)]),

    membership: expect.toBeOneOf(Object.keys(CHAT_GROUP.MEMBERSHIP)),
    admins: expect.arrayContaining([expectedIdFormat]),
    users: expect.arrayContaining([expectedIdFormat]),
    marshals: expect.any(Array),
    chats: expect.arrayContaining([expectedChatFormat]),

    key: expect.toBeOneOf([null, expect.any(String)]),
    url: expect.toBeOneOf([null, expect.any(String)]),
    logoUrl: expect.toBeOneOf([null, expect.any(String)]),

    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),

    contentsToken: expect.any(String),
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
    apolloExpect(res, 'data', { chatGroups: expect.arrayContaining([expectedFormat]) });
    expect(
      res.data!.chatGroups.length
        ? res.data!.chatGroups.some(chatGroup => chatGroup.key && chatGroup.flags.includes(CHAT_GROUP.FLAG.ADMIN))
        : 'NO admin chatGroups',
    ).toBeTrue();
  });

  test('should response a single object when GET One (adminMessage) by ID (as adminUser)', async () => {
    expect.assertions(1);

    const chatGroups = await ChatGroup.find({
      users: adminUser!._id,
      key: { $exists: true },
      flags: CHAT_GROUP.FLAG.ADMIN,
      deletedAt: { $exists: false },
    }).lean();

    const id = randomItem(chatGroups)._id.toString();
    const res = await adminServer!.executeOperation({ query: GET_CHAT_GROUP, variables: { id } });
    apolloExpect(res, 'data', { chatGroup: { ...expectedFormat, _id: id, key: expect.any(String) } });
  });

  test('should response an array of data when GET all (as normalUser)', async () => {
    expect.assertions(1);

    const res = await normalServer!.executeOperation({ query: GET_CHAT_GROUPS });
    apolloExpect(res, 'data', { chatGroups: expect.arrayContaining([expectedFormat]) });
  });

  test('should response a single object when GET One by ID (as normalUser)', async () => {
    expect.assertions(1);

    const chatGroups = await ChatGroup.find({ users: normalUser!, deletedAt: { $exists: false } }).lean();
    const id = randomItem(chatGroups)._id.toString();
    const res = await normalServer!.executeOperation({ query: GET_CHAT_GROUP, variables: { id } });
    apolloExpect(res, 'data', { chatGroup: { ...expectedFormat, _id: id } });
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

  test('should pass when JOIN book chatGroup as teacher', async () => {
    expect.assertions(1);

    const [books, teacherLevel] = await Promise.all([
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const teacher = normalUsers!.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw 'No teacher is found';

    const id = randomItem(books).chatGroup.toString();
    const res = await testServer(teacher).executeOperation({ query: JOIN_BOOK_CHAT_GROUP, variables: { id } });

    apolloExpect(res, 'data', { joinBookChatGroup: { ...expectedFormat, admins: [], chats: expect.any(Array) } }); // bookChatGroups have NO admins
  });

  test('should fail when JOIN book chatGroup as non-teacher', async () => {
    expect.assertions(1);

    const [bookChatGroups, teacherLevel] = await Promise.all([
      ChatGroup.find({ flags: CHAT_GROUP.FLAG.BOOK }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const nonTeacher = normalUsers!.find(({ schoolHistories }) => !schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!nonTeacher) throw 'No valid non-teacher available for testing';

    const id = randomItem(bookChatGroups)._id.toString();
    const res = await testServer(nonTeacher).executeOperation({ query: JOIN_BOOK_CHAT_GROUP, variables: { id } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should pass when post two message toAdmin', async () => {
    expect.assertions(2);

    // create a new user without any admin-message
    const user = genUser(tenantId!);
    const [{ adminIds }] = await Promise.all([User.findSystemAccountIds(), user.save()]);
    const userServer = testServer(user);

    const expectedFormatEx = {
      ...expectedFormat,
      flags: [CHAT_GROUP.FLAG.ADMIN],
      tenant: null,
      title: expect.any(String),
      description: null,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: adminIds.map(a => a.toString()),
      users: [...adminIds, user._id].map(u => u.toString()),
      key: `USER#${user._id}`,
      url: null,
      logoUrl: null,
    };

    const res1 = await userServer.executeOperation({
      query: TO_ADMIN_CHAT_GROUP,
      variables: { content: FAKE },
    });

    apolloExpect(res1, 'data', {
      toAdminChatGroup: {
        ...expectedFormatEx,
        // chats: [{ ...expectedChatFormat, members: [expectedMember(user._id, [], true)] }],
      },
    });

    const res2 = await userServer.executeOperation({
      query: TO_ADMIN_CHAT_GROUP,
      variables: { content: FAKE2 },
    });
    apolloExpect(res2, 'data', {
      toAdminChatGroup: {
        ...expectedFormatEx,
        chats: [
          { ...expectedChatFormat, members: [expectedMember(user._id, [], true)] },
          { ...expectedChatFormat, members: [expectedMember(user._id, [], true)] },
        ],
      },
    });

    // clean up
    await user.deleteOne();
  });

  test('should pass when post two message toAlex', async () => {
    expect.assertions(2);

    // create a brand new user without previous messages with Alex
    const user = genUser(tenantId!);
    const [{ alexId }] = await Promise.all([User.findSystemAccountIds(), user.save()]);
    const userId = user._id.toString();
    const userServer = testServer(user);

    const expectedFormatEx = {
      ...expectedFormat,
      title: null,
      description: null,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: alexId ? [userId, alexId.toString()] : [userId],
      key: `ALEX#USER#${userId}`,
      url: null,
      logoUrl: null,
    };

    const res1 = await userServer.executeOperation({
      query: TO_ALEX_CHAT_GROUP,
      variables: { content: FAKE },
    });
    apolloExpect(res1, 'data', {
      toAlexChatGroup: {
        ...expectedFormatEx,
        chats: [{ ...expectedChatFormat, members: [expectedMember(userId, [], true)] }],
      },
    });

    const res2 = await userServer.executeOperation({
      query: TO_ALEX_CHAT_GROUP,
      variables: { content: FAKE2 },
    });
    apolloExpect(res2, 'data', {
      toAlexChatGroup: {
        ...expectedFormatEx,
        chats: [
          { ...expectedChatFormat, members: [expectedMember(userId, [], true)] },
          { ...expectedChatFormat, members: [expectedMember(userId, [], true)] },
        ],
      },
    });

    // clean up
    await user.deleteOne();
  });

  const messageToTenantAdmins = async (to: 'admins' | 'counselors' | 'supports') => {
    expect.assertions(2);

    const user = genUser(tenantId!);
    const [tenant] = await Promise.all([Tenant.findByTenantId(tenantId!), user.save()]);
    const userId = user._id.toString();
    const userServer = testServer(user);

    const [query, users] =
      to === 'admins'
        ? [TO_TENANT_ADMINS_CHAT_GROUP, tenant!.admins.map(u => u.toString())]
        : to === 'counselors'
        ? [TO_TENANT_COUNSELORS_CHAT_GROUP, tenant!.counselors.map(u => u.toString())]
        : [TO_TENANT_SUPPORTS_CHAT_GROUP, tenant!.supports.map(u => u.toString())];

    const expectedFormatEx = {
      ...expectedFormat,
      flags: [`TENANT_${to.toUpperCase()}`],
      tenant: tenantId,
      title: null,
      description: null,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: [userId, ...users],
      key: `TENANT#${tenantId}-USER#${userId} (${to})`,
      url: null,
      logoUrl: null,
    };

    const res1 = await userServer.executeOperation({
      query,
      variables: { tenantId: tenantId!, content: FAKE },
    });
    const expectedRes1 = {
      ...expectedFormatEx,
      chats: [{ ...expectedChatFormat, members: [expectedMember(userId, [], true)] }],
    };
    apolloExpect(
      res1,
      'data',
      to === 'admins'
        ? { toTenantAdminsChatGroup: expectedRes1 }
        : to === 'counselors'
        ? { toTenantCounselorsChatGroup: expectedRes1 }
        : { toTenantSupportsChatGroup: expectedRes1 },
    );

    const res2 = await userServer.executeOperation({
      query,
      variables: { tenantId: tenantId!, content: FAKE2 },
    });
    const expectedRes2 = {
      ...expectedFormatEx,
      chats: [
        { ...expectedChatFormat, members: [expectedMember(userId, [], true)] },
        { ...expectedChatFormat, members: [expectedMember(userId, [], true)] },
      ],
    };
    apolloExpect(
      res2,
      'data',
      to === 'admins'
        ? { toTenantAdminsChatGroup: expectedRes2 }
        : to === 'counselors'
        ? { toTenantCounselorsChatGroup: expectedRes2 }
        : { toTenantSupportsChatGroup: expectedRes2 },
    );

    // clean up
    await user.deleteOne();
  };

  test('should pass when post two message toTenantAdmin', async () => messageToTenantAdmins('admins'));
  test('should pass when post two message toTenantCounselors', async () => messageToTenantAdmins('counselors'));
  test('should pass when post two message toTenantSupports', async () => messageToTenantAdmins('supports'));

  test('should fail when creating chatGroup (when user is not identifiedAt)', async () => {
    expect.assertions(1);

    // create a new user (without identifiedAt)
    const user = genUser(tenantId!);
    await user.save();

    const user0Id = normalUser!._id.toString();
    const res = await testServer(user).executeOperation({
      query: ADD_CHAT_GROUP,
      variables: { tenantId: tenantId!, userIds: [user0Id], membership: CHAT_GROUP.MEMBERSHIP.CLOSED },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // clean-up
    await user.deleteOne();
  });

  test('should pass when attaching chat from another chatGroup', async () => {
    expect.assertions(1);

    const { chatGroup } = genChatGroup(tenantId!, normalUser!._id); // create a destination chatGroup
    const { chatGroup: source, chat, content } = genChatGroup(tenantId!, normalUser!._id); // create source (another) chatGroup
    chatGroup.chats = []; // drop & ignore chats
    await Promise.all([chatGroup.save(), source.save(), chat.save(), content.save()]);
    //! Note: at the point, chatGroup.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    const res = await normalServer!.executeOperation({
      query: ATTACH_CHAT_GROUP_TO_CHAT_GROUP,
      variables: { id: chatGroup._id.toString(), chatId: chat._id.toString(), sourceId: source._id.toString() },
    });
    apolloExpect(res, 'data', {
      attachChatGroupChatToChatGroup: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, _id: chat._id.toString(), contents: [content._id.toString()] }],
      },
    });

    // clean-up (as the documents are only partially formatted)
    await Promise.all([chatGroup.deleteOne(), source.deleteOne()]);
  });

  test('should pass when sharing question to chatGroup', async () => {
    expect.assertions(1);

    const { chatGroup } = genChatGroup(tenantId!, normalUser!._id);
    const { question, content } = genQuestion(tenantId!, normalUser!._id);
    await Promise.all([chatGroup.save(), question.save(), content.save()]);
    //! Note: at the point, chatGroup.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    const res1 = await normalServer!.executeOperation({
      query: SHARE_QUESTION_TO_CHAT_GROUP,
      variables: { id: chatGroup._id.toString(), sourceId: question._id.toString() },
    });
    apolloExpect(res1, 'data', {
      shareQuestionToChatGroup: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, contents: [expectedIdFormat, content._id.toString()] }], // first contentId is auto-gen message
      },
    });

    // clean-up (as the documents are only partially formatted)
    await Promise.all([chatGroup.deleteOne(), question.deleteOne()]);
  });

  test('should pass the full suite', async () => {
    expect.assertions(21);

    const [, , , user2, , join] = normalUsers!;
    const [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] = normalUsers!.map(u => u._id.toString());
    const ownerServer = normalServer!;

    [url, url2] = await Promise.all([jestPutObject(ownerId!), jestPutObject(ownerId!)]);

    const create = {
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      ...(prob(0.5) && { title: FAKE }),
      ...(prob(0.5) && { description: FAKE }),
      ...(prob(0.5) && { logoUrl: url }),
    };

    // (owner) add ChatGroup
    const createdRes = await ownerServer.executeOperation({
      query: ADD_CHAT_GROUP,
      variables: { tenantId: tenantId!, userIds: [user0Id], ...create },
    });
    apolloExpect(createdRes, 'data', {
      addChatGroup: {
        ...expectedFormat,
        ...create,
        tenant: tenantId!,
        admins: [ownerId],
        users: [ownerId, user0Id].sort(),
        chats: [],
      },
    });
    const newId: string = createdRes.data!.addChatGroup._id;

    // (owner) update users
    const updateUsersRes = await ownerServer.executeOperation({
      query: UPDATE_CHAT_GROUP_USERS,
      variables: { id: newId, userIds: [user1Id, user2Id] },
    });
    apolloExpect(updateUsersRes, 'data', {
      updateChatGroupUsers: {
        ...expectedFormat,
        admins: [ownerId],
        users: [ownerId, user1Id, user2Id].sort(),
        chats: [],
      },
    });

    // (owner) promote 1 user to admin
    const addAdminsRes = await ownerServer.executeOperation({
      query: UPDATE_CHAT_GROUP_ADMINS,
      variables: { id: newId, userIds: [user1Id] },
    });
    apolloExpect(addAdminsRes, 'data', {
      updateChatGroupAdmins: { ...expectedFormat, admins: [ownerId, user1Id].sort(), chats: [] },
    });

    // (joinUser) should fail when joining CLOSED membership
    const joinServer = testServer(join);
    const joinFailRes = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    apolloExpect(joinFailRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // (user2) for CLOSED-MEMBERSHIP, should fail when regular user (user2) tries to addUsers
    const user2Server = testServer(user2);
    const addUsersFailRes = await user2Server.executeOperation({
      query: UPDATE_CHAT_GROUP_USERS,
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
        ...expectedFormat,
        title: FAKE2,
        description: FAKE2,
        membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
        logoUrl: null, // logoUrl is removed
        chats: [],
      },
    });

    // (user2) for NORMAL-MEMBERSHIP, any existing user could add new users
    const addUsers2Res = await user2Server.executeOperation({
      query: UPDATE_CHAT_GROUP_USERS,
      variables: { id: newId, userIds: [ownerId, user0Id, user1Id, user3Id] },
    });
    apolloExpect(addUsers2Res, 'data', {
      updateChatGroupUsers: {
        ...expectedFormat,
        users: [user2Id, ownerId, user0Id, user1Id, user3Id].sort(),
        chats: [],
      },
    });

    // (joinUser) should fail when joining non PUBLIC membership
    const joinFail2Res = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    apolloExpect(joinFail2Res, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // (owner) change to PUBLIC-MEMBERSHIP & add logoUrl back
    const updated2Res = await ownerServer.executeOperation({
      query: UPDATE_CHAT_GROUP,
      variables: { id: newId, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2 },
    });
    apolloExpect(updated2Res, 'data', {
      updateChatGroup: { ...expectedFormat, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2, chats: [] },
    });

    // (joinUser) should pass when joining a PUBLIC-MEMBERSHIP
    const joinRes = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    apolloExpect(joinRes, 'data', {
      joinChatGroup: {
        ...expectedFormat,
        users: [...[user2Id, ownerId, user0Id, user1Id, user3Id].sort(), joinId], // joinId just appends to the end
        chats: [],
      },
    });

    // (joinUser) should pass when leaving chatGroup
    const leaveRes = await joinServer.executeOperation({ query: LEAVE_CHAT_GROUP, variables: { id: newId } });
    apolloExpect(leaveRes, 'data', { leaveChatGroup: { code: MSG_ENUM.COMPLETED } });

    // (owner) addContentWithNewChat
    const addContentWithNewChatRes = await ownerServer.executeOperation({
      query: ADD_CHAT_GROUP_CONTENT_WITH_NEW_CHAT,
      variables: { id: newId, content: FAKE },
    });
    apolloExpect(addContentWithNewChatRes, 'data', {
      addChatGroupContentWithNewChat: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, contents: [expectedIdFormat], members: [expectedMember(ownerId, [], true)] }],
      },
    });
    const chatId = addContentWithNewChatRes.data!.addChatGroupContentWithNewChat.chats[0]._id.toString();

    // (user2) addContent (append to first chat)
    const addContentRes = await user2Server.executeOperation({
      query: ADD_CHAT_GROUP_CONTENT,
      variables: { id: newId, chatId, content: FAKE },
    });
    apolloExpect(addContentRes, 'data', {
      addChatGroupContent: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] }],
      },
    });
    const contentIds = addContentRes.data?.addChatGroupContent.chats[0].contents;

    // (user2) addContentWithNewChat
    const addContentWithNewChatRes2 = await user2Server.executeOperation({
      query: ADD_CHAT_GROUP_CONTENT_WITH_NEW_CHAT,
      variables: { id: newId, content: FAKE },
    });
    apolloExpect(addContentWithNewChatRes2, 'data', {
      addChatGroupContentWithNewChat: {
        ...expectedFormat,
        chats: [
          { ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] },
          { ...expectedChatFormat, contents: [expectedIdFormat], members: [expectedMember(user2Id, [], true)] },
        ],
      },
    });

    // (owner) recall first content of first chat (his owner content)
    const recallContentRes = await ownerServer.executeOperation({
      query: RECALL_CHAT_GROUP_CONTENT,
      variables: { id: newId, chatId, contentId: contentIds[0] },
    });
    apolloExpect(recallContentRes, 'data', {
      recallChatGroupContent: {
        ...expectedFormat,
        chats: [
          { ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] },
          { ...expectedChatFormat, contents: [expectedIdFormat], members: [expectedMember(user2Id, [], true)] },
        ],
      },
    });

    // (owner) recall second content of first chat (user2's content)
    const blockContentRes = await ownerServer.executeOperation({
      query: BLOCK_CHAT_GROUP_CONTENT,
      variables: { id: newId, chatId, contentId: contentIds[1] },
    });
    apolloExpect(blockContentRes, 'data', {
      blockChatGroupContent: {
        ...expectedFormat,
        chats: [
          { ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] },
          { ...expectedChatFormat, contents: [expectedIdFormat], members: [expectedMember(user2Id, [], true)] },
        ],
      },
    });

    // (owner) set chat flag
    const flag = CHAT.MEMBER.FLAG.IMPORTANT;
    const setChatFlagRes = await ownerServer.executeOperation({
      query: SET_CHAT_GROUP_CHAT_FLAG,
      variables: { id: newId, chatId, ownerId, flag },
    });
    apolloExpect(setChatFlagRes, 'data', {
      setChatGroupChatFlag: {
        ...expectedFormat,
        chats: [
          {
            ...expectedChatFormat,
            contents: [expectedIdFormat, expectedIdFormat],
            members: [expectedMember(ownerId, [flag], true), expectedMember(user2Id, [], true)],
          },
          { ...expectedChatFormat, contents: [expectedIdFormat] },
        ],
      },
    });

    // (owner) clear chat flag
    const clearChatFlagRes = await ownerServer.executeOperation({
      query: CLEAR_CHAT_GROUP_CHAT_FLAG,
      variables: { id: newId, chatId, flag },
    });
    apolloExpect(clearChatFlagRes, 'data', {
      clearChatGroupChatFlag: {
        ...expectedFormat,
        chats: [
          {
            ...expectedChatFormat,
            contents: [expectedIdFormat, expectedIdFormat],
            members: [expectedMember(ownerId, [], true), expectedMember(user2Id, [], true)],
          },
          { ...expectedChatFormat, contents: [expectedIdFormat] },
        ],
      },
    });

    // (user2) update chat lastViewedAt
    const updateLatViewedAtRes = await user2Server.executeOperation({
      query: UPDATE_CHAT_GROUP_CHAT_LAST_VIEWED_AT,
      variables: { id: newId, chatId },
    });
    apolloExpect(updateLatViewedAtRes, 'data', {
      updateChatGroupChatLastViewedAt: {
        ...expectedFormat,
        chats: [
          {
            ...expectedChatFormat,
            contents: [expectedIdFormat, expectedIdFormat],
            members: [expectedMember(ownerId, [], true), expectedMember(user2Id, [], true)],
          },
          { ...expectedChatFormat, contents: [expectedIdFormat] },
        ],
      },
    });

    // (owner) set chat title
    const updateChatTitleRes = await ownerServer.executeOperation({
      query: UPDATE_CHAT_GROUP_CHAT_TITLE,
      variables: { id: newId, chatId, title: FAKE },
    });
    apolloExpect(updateChatTitleRes, 'data', {
      updateChatGroupChatTitle: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, title: FAKE }, expectedChatFormat],
      },
    });

    // (owner) unset chat title
    const updateChatTitleRes2 = await ownerServer.executeOperation({
      query: UPDATE_CHAT_GROUP_CHAT_TITLE,
      variables: { id: newId, chatId },
    });
    apolloExpect(updateChatTitleRes2, 'data', {
      updateChatGroupChatTitle: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, title: null }, expectedChatFormat],
      },
    });
  });
});
