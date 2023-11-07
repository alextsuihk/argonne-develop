/**
 * Jest: /resolvers/chat-groups
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
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
  apolloContext,
  apolloTestServer,
} from '../jest';
import Book from '../models/book';
import ChatGroup from '../models/chat-group';
import Level from '../models/level';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
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
import chatGroupController from '../controllers/chat-group';

type ChatGroupDocumentEx = Awaited<ReturnType<typeof chatGroupController.create>>;

const { MSG_ENUM } = LOCALE;
const { CHAT, CHAT_GROUP } = LOCALE.DB_ENUM;

// Top chat of this test suite:
describe('ChatGroup GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

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

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response an array of data when GET all (as adminUser)', async () => {
    expect.assertions(2);

    const res = await apolloTestServer.executeOperation<{ chatGroups: ChatGroupDocumentEx[] }>(
      { query: GET_CHAT_GROUPS },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res, 'data', { chatGroups: expect.arrayContaining([expectedFormat]) });
    expect(
      res.body.kind === 'single' &&
        res.body.singleResult.data!.chatGroups.some(
          chatGroup => chatGroup.key && chatGroup.flags.includes(CHAT_GROUP.FLAG.ADMIN),
        ),
    ).toBeTrue();
  });

  test('should response a single object when GET One (adminMessage) by ID (as adminUser)', async () => {
    expect.assertions(1);

    const chatGroups = await ChatGroup.find({
      users: jest.adminUser._id,
      key: { $exists: true },
      flags: CHAT_GROUP.FLAG.ADMIN,
      deletedAt: { $exists: false },
    }).lean();

    const id = randomItem(chatGroups)._id.toString();
    const res = await apolloTestServer.executeOperation(
      { query: GET_CHAT_GROUP, variables: { id } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res, 'data', { chatGroup: { ...expectedFormat, _id: id, key: expect.any(String) } });
  });

  test('should response an array of data when GET all (as normalUser)', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: GET_CHAT_GROUPS },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', { chatGroups: expect.arrayContaining([expectedFormat]) });
  });

  test('should response a single object when GET One by ID (as normalUser)', async () => {
    expect.assertions(1);

    const chatGroups = await ChatGroup.find({ users: jest.normalUser, deletedAt: { $exists: false } }).lean();
    const id = randomItem(chatGroups)._id.toString();
    const res = await apolloTestServer.executeOperation(
      { query: GET_CHAT_GROUP, variables: { id } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', { chatGroup: { ...expectedFormat, _id: id } });
  });

  test('should fail when GET all (as guest)', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: GET_CHAT_GROUPS },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET One by ID (as guest)', async () => {
    expect.assertions(1);

    const chatGroup = await ChatGroup.findOne().lean();
    const res = await apolloTestServer.executeOperation(
      { query: GET_CHAT_GROUP, variables: { id: chatGroup!._id.toString() } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_CHAT_GROUP },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_CHAT_GROUP, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should pass when JOIN book chatGroup as teacher', async () => {
    expect.assertions(1);

    const [books, teacherLevel] = await Promise.all([
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const teacher = jest.normalUsers.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw 'No teacher is found';

    const id = randomItem(books).chatGroup.toString();
    const res = await apolloTestServer.executeOperation(
      { query: JOIN_BOOK_CHAT_GROUP, variables: { id } },
      { contextValue: apolloContext(teacher) },
    );

    apolloExpect(res, 'data', {
      joinBookChatGroup: { ...expectedFormat, _id: id, admins: [], chats: expect.any(Array) },
    }); // bookChatGroups have NO admins, sometimes, not even have chats
  });

  test('should fail when JOIN book chatGroup as non-teacher', async () => {
    expect.assertions(1);

    const [bookChatGroups, teacherLevel] = await Promise.all([
      ChatGroup.find({ flags: CHAT_GROUP.FLAG.BOOK }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const nonTeacher = jest.normalUsers.find(
      ({ schoolHistories }) => !schoolHistories[0]?.level.equals(teacherLevel!._id),
    );
    if (!nonTeacher) throw 'No valid non-teacher available for testing';

    const id = randomItem(bookChatGroups)._id.toString();
    const res = await apolloTestServer.executeOperation(
      { query: JOIN_BOOK_CHAT_GROUP, variables: { id } },
      { contextValue: apolloContext(nonTeacher) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should pass when post two messages toAdmin', async () => {
    expect.assertions(2);

    // create a new user without any admin-message
    const user = genUser(jest.tenantId);
    const [{ adminIds }] = await Promise.all([User.findSystemAccountIds(), user.save()]);

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

    const res1 = await apolloTestServer.executeOperation(
      { query: TO_ADMIN_CHAT_GROUP, variables: { content: FAKE } },
      { contextValue: apolloContext(user) },
    );

    apolloExpect(res1, 'data', {
      toAdminChatGroup: {
        ...expectedFormatEx,
        chats: [{ ...expectedChatFormat, members: [expectedMember(user._id, [], true)] }],
      },
    });

    const res2 = await apolloTestServer.executeOperation(
      { query: TO_ADMIN_CHAT_GROUP, variables: { content: FAKE2 } },
      { contextValue: apolloContext(user) },
    );
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
    await User.deleteOne({ _id: user._id });
  });

  test('should pass when post two message toAlex', async () => {
    expect.assertions(2);

    // create a brand new user without previous messages with Alex
    const user = genUser(jest.tenantId);
    const [{ alexId }] = await Promise.all([User.findSystemAccountIds(), user.save()]);
    const userId = user._id.toString();

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

    const res1 = await apolloTestServer.executeOperation(
      { query: TO_ALEX_CHAT_GROUP, variables: { content: FAKE } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res1, 'data', {
      toAlexChatGroup: {
        ...expectedFormatEx,
        chats: [{ ...expectedChatFormat, members: [expectedMember(userId, [], true)] }],
      },
    });

    const res2 = await apolloTestServer.executeOperation(
      { query: TO_ALEX_CHAT_GROUP, variables: { content: FAKE2 } },
      { contextValue: apolloContext(user) },
    );
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
    await User.deleteOne({ _id: user._id });
  });

  const messageToTenantAdmins = async (to: 'admins' | 'counselors' | 'supports') => {
    expect.assertions(2);

    const user = genUser(jest.tenantId);
    const [tenant] = await Promise.all([Tenant.findByTenantId(jest.tenantId), user.save()]);
    const userId = user._id.toString();

    const [query, users] =
      to === 'admins'
        ? [TO_TENANT_ADMINS_CHAT_GROUP, tenant!.admins.map(u => u.toString())]
        : to === 'counselors'
        ? [TO_TENANT_COUNSELORS_CHAT_GROUP, tenant!.counselors.map(u => u.toString())]
        : [TO_TENANT_SUPPORTS_CHAT_GROUP, tenant!.supports.map(u => u.toString())];

    const expectedFormatEx = {
      ...expectedFormat,
      flags: [`TENANT_${to.toUpperCase()}`],
      tenant: jest.tenantId,
      title: null,
      description: null,
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      admins: [],
      users: [userId, ...users],
      key: `TENANT#${jest.tenantId}-USER#${userId} (${to})`,
      url: null,
      logoUrl: null,
    };

    const res1 = await apolloTestServer.executeOperation(
      { query, variables: { tenantId: jest.tenantId, content: FAKE } },
      { contextValue: apolloContext(user) },
    );
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

    const res2 = await apolloTestServer.executeOperation(
      { query, variables: { tenantId: jest.tenantId, content: FAKE2 } },
      { contextValue: apolloContext(user) },
    );
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
    await User.deleteOne({ _id: user._id });
  };

  test('should pass when post two message toTenantAdmin', async () => messageToTenantAdmins('admins'));
  test('should pass when post two message toTenantCounselors', async () => messageToTenantAdmins('counselors'));
  test('should pass when post two message toTenantSupports', async () => messageToTenantAdmins('supports'));

  test('should fail when creating chatGroup (when user is not identifiedAt)', async () => {
    expect.assertions(1);

    // create a new user (without identifiedAt)
    const user = genUser(jest.tenantId);
    await user.save();

    const user0Id = jest.normalUser._id.toString();
    const res = await apolloTestServer.executeOperation(
      {
        query: ADD_CHAT_GROUP,
        variables: { tenantId: jest.tenantId, userIds: [user0Id], membership: CHAT_GROUP.MEMBERSHIP.CLOSED },
      },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass when attaching chat from another chatGroup', async () => {
    expect.assertions(1);

    const { chatGroup } = genChatGroup(jest.tenantId, jest.normalUser._id); // create a destination chatGroup
    const { chatGroup: source, chat, content } = genChatGroup(jest.tenantId, jest.normalUser._id); // create source (another) chatGroup
    chatGroup.chats = []; // drop & ignore chats
    await Promise.all([chatGroup.save(), source.save(), chat.save(), content.save()]);
    //! Note: at the point, chatGroup.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    const res = await apolloTestServer.executeOperation(
      {
        query: ATTACH_CHAT_GROUP_TO_CHAT_GROUP,
        variables: { id: chatGroup._id.toString(), chatId: chat._id.toString(), sourceId: source._id.toString() },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', {
      attachChatGroupChatToChatGroup: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, _id: chat._id.toString(), contents: [content._id.toString()] }],
      },
    });

    // clean-up (as the documents are only partially formatted)
    await Promise.all([chatGroup.deleteOne(), source.deleteOne()]);
  });

  test('should pass when sharing question to chatGroup (as student)', async () => {
    expect.assertions(1);

    const { chatGroup } = genChatGroup(jest.tenantId, jest.normalUser._id);
    const { question, content } = genQuestion(jest.tenantId, jest.normalUser._id, { student: jest.normalUser._id });
    await Promise.all([chatGroup.save(), question.save(), content.save()]);
    //! Note: at the point, chatGroup.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    const res = await apolloTestServer.executeOperation(
      {
        query: SHARE_QUESTION_TO_CHAT_GROUP,
        variables: { id: chatGroup._id.toString(), sourceId: question._id.toString() },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', {
      shareQuestionToChatGroup: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, contents: [expectedIdFormat, content._id.toString()] }], // first contentId is auto-gen message
      },
    });

    // clean-up (as the documents are only partially formatted)
    await Promise.all([chatGroup.deleteOne(), question.deleteOne()]);
  });

  test('should pass when sharing question to chatGroup (as tutor)', async () => {
    expect.assertions(1);

    const { chatGroup } = genChatGroup(jest.tenantId, jest.normalUser._id);
    const { question, content } = genQuestion(jest.tenantId, jest.normalUser._id, { tutor: jest.normalUser._id });
    await Promise.all([chatGroup.save(), question.save(), content.save()]);
    //! Note: at the point, chatGroup.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    const res = await apolloTestServer.executeOperation(
      {
        query: SHARE_QUESTION_TO_CHAT_GROUP,
        variables: { id: chatGroup._id.toString(), sourceId: question._id.toString() },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', {
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

    const [owner, , , user2, , join] = jest.normalUsers;
    const [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] = jest.normalUsers.map(u => u._id.toString());

    const [url, url2] = await Promise.all([jestPutObject(owner._id), jestPutObject(owner._id)]);

    const create = {
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      ...(prob(0.5) && { title: FAKE }),
      ...(prob(0.5) && { description: FAKE }),
      ...(prob(0.5) && { logoUrl: url }),
    };

    // (owner) add ChatGroup
    const createdRes = await apolloTestServer.executeOperation<{ addChatGroup: ChatGroupDocumentEx }>(
      { query: ADD_CHAT_GROUP, variables: { tenantId: jest.tenantId, userIds: [user0Id], ...create } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(createdRes, 'data', {
      addChatGroup: {
        ...expectedFormat,
        ...create,
        tenant: jest.tenantId,
        admins: [ownerId],
        users: [ownerId, user0Id].sort(),
        chats: [],
      },
    });

    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addChatGroup._id.toString() : null;

    // (owner) update users
    const updateUsersRes = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP_USERS, variables: { id: newId, userIds: [user1Id, user2Id] } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(updateUsersRes, 'data', {
      updateChatGroupUsers: {
        ...expectedFormat,
        admins: [ownerId],
        users: [ownerId, user1Id, user2Id].sort(),
        chats: [],
      },
    });

    // (owner) promote 1 user to admin
    const addAdminsRes = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP_ADMINS, variables: { id: newId, userIds: [user1Id] } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(addAdminsRes, 'data', {
      updateChatGroupAdmins: { ...expectedFormat, admins: [ownerId, user1Id].sort(), chats: [] },
    });

    // (joinUser) should fail when joining CLOSED membership
    const joinFailRes = await apolloTestServer.executeOperation(
      { query: JOIN_CHAT_GROUP, variables: { id: newId } },
      { contextValue: apolloContext(join) },
    );
    apolloExpect(joinFailRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // (user2) for CLOSED-MEMBERSHIP, should fail when regular user (user2) tries to addUsers
    const addUsersFailRes = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP_USERS, variables: { id: newId, userIds: [user3Id] } },
      { contextValue: apolloContext(user2) },
    );
    apolloExpect(addUsersFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // (owner) change to NORMAL-MEMBERSHIP & remove logoUrl
    const update = { title: FAKE2, description: FAKE2, membership: CHAT_GROUP.MEMBERSHIP.NORMAL };
    const updatedRes = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP, variables: { id: newId, ...update, logoUrl: '' } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(updatedRes, 'data', { updateChatGroup: { ...expectedFormat, ...update, logoUrl: null, chats: [] } }); // logoUrl is removed

    // (user2) for NORMAL-MEMBERSHIP, any existing user could add new users
    const addUsers2Res = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP_USERS, variables: { id: newId, userIds: [ownerId, user0Id, user1Id, user3Id] } },
      { contextValue: apolloContext(user2) },
    );
    apolloExpect(addUsers2Res, 'data', {
      updateChatGroupUsers: {
        ...expectedFormat,
        users: [user2Id, ownerId, user0Id, user1Id, user3Id].sort(),
        chats: [],
      },
    });

    // (joinUser) should fail when joining non PUBLIC membership
    const joinFail2Res = await apolloTestServer.executeOperation(
      { query: JOIN_CHAT_GROUP, variables: { id: newId } },
      { contextValue: apolloContext(join) },
    );
    apolloExpect(joinFail2Res, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // (owner) change to PUBLIC-MEMBERSHIP & add logoUrl back
    const updated2Res = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP, variables: { id: newId, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2 } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(updated2Res, 'data', {
      updateChatGroup: { ...expectedFormat, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2, chats: [] },
    });

    // (joinUser) should pass when joining a PUBLIC-MEMBERSHIP
    const joinRes = await apolloTestServer.executeOperation(
      { query: JOIN_CHAT_GROUP, variables: { id: newId } },
      { contextValue: apolloContext(join) },
    );
    apolloExpect(joinRes, 'data', {
      joinChatGroup: {
        ...expectedFormat,
        users: [...[user2Id, ownerId, user0Id, user1Id, user3Id].sort(), joinId], // joinId just appends to the end
        chats: [],
      },
    });

    // (joinUser) should pass when leaving chatGroup
    const leaveRes = await apolloTestServer.executeOperation(
      { query: LEAVE_CHAT_GROUP, variables: { id: newId } },
      { contextValue: apolloContext(join) },
    );
    apolloExpect(leaveRes, 'data', { leaveChatGroup: { code: MSG_ENUM.COMPLETED } });

    // (owner) addContentWithNewChat
    const addContentWithNewChatRes = await apolloTestServer.executeOperation<{
      addChatGroupContentWithNewChat: ChatGroupDocumentEx;
    }>(
      { query: ADD_CHAT_GROUP_CONTENT_WITH_NEW_CHAT, variables: { id: newId, content: FAKE } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(addContentWithNewChatRes, 'data', {
      addChatGroupContentWithNewChat: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, contents: [expectedIdFormat], members: [expectedMember(ownerId, [], true)] }],
      },
    });
    const chatId =
      addContentWithNewChatRes.body.kind === 'single'
        ? addContentWithNewChatRes.body.singleResult.data!.addChatGroupContentWithNewChat.chats[0]._id.toString()
        : null;

    // (user2) addContent (append to first chat)
    const addContentRes = await apolloTestServer.executeOperation<{ addChatGroupContent: ChatGroupDocumentEx }>(
      { query: ADD_CHAT_GROUP_CONTENT, variables: { id: newId, chatId, content: FAKE } },
      { contextValue: apolloContext(user2) },
    );
    apolloExpect(addContentRes, 'data', {
      addChatGroupContent: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] }],
      },
    });
    const contentIds =
      addContentRes.body.kind === 'single'
        ? addContentRes.body.singleResult.data!.addChatGroupContent.chats[0].contents
        : null;

    // (user2) addContentWithNewChat
    const addContentWithNewChatRes2 = await apolloTestServer.executeOperation(
      { query: ADD_CHAT_GROUP_CONTENT_WITH_NEW_CHAT, variables: { id: newId, content: FAKE } },
      { contextValue: apolloContext(user2) },
    );
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
    const recallContentRes = await apolloTestServer.executeOperation(
      { query: RECALL_CHAT_GROUP_CONTENT, variables: { id: newId, chatId, contentId: contentIds![0] } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(recallContentRes, 'data', {
      recallChatGroupContent: {
        ...expectedFormat,
        chats: [
          { ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] },
          { ...expectedChatFormat, contents: [expectedIdFormat], members: [expectedMember(user2Id, [], true)] },
        ],
      },
    }); // unfortunately recall() only update chatGroup.updatedAt

    // (owner) recall second content of first chat (user2's content)
    const blockContentRes = await apolloTestServer.executeOperation(
      { query: BLOCK_CHAT_GROUP_CONTENT, variables: { id: newId, chatId, contentId: contentIds![1] } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(blockContentRes, 'data', {
      blockChatGroupContent: {
        ...expectedFormat,
        chats: [
          { ...expectedChatFormat, contents: [expectedIdFormat, expectedIdFormat] },
          { ...expectedChatFormat, contents: [expectedIdFormat], members: [expectedMember(user2Id, [], true)] },
        ],
      },
    }); // unfortunately block() only update chatGroup.updatedAt

    // (owner) set chat flag
    const flag = CHAT.MEMBER.FLAG.IMPORTANT;
    const setChatFlagRes = await apolloTestServer.executeOperation(
      { query: SET_CHAT_GROUP_CHAT_FLAG, variables: { id: newId, chatId, ownerId, flag } },
      { contextValue: apolloContext(owner) },
    );
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
    const clearChatFlagRes = await apolloTestServer.executeOperation(
      { query: CLEAR_CHAT_GROUP_CHAT_FLAG, variables: { id: newId, chatId, flag } },
      { contextValue: apolloContext(owner) },
    );
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
    const updateLatViewedAtRes = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP_CHAT_LAST_VIEWED_AT, variables: { id: newId, chatId } },
      { contextValue: apolloContext(user2) },
    );
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
    const updateChatTitleRes = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP_CHAT_TITLE, variables: { id: newId, chatId, title: FAKE } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(updateChatTitleRes, 'data', {
      updateChatGroupChatTitle: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, title: FAKE }, expectedChatFormat],
      },
    });

    // (owner) unset chat title
    const updateChatTitleRes2 = await apolloTestServer.executeOperation(
      { query: UPDATE_CHAT_GROUP_CHAT_TITLE, variables: { id: newId, chatId } },
      { contextValue: apolloContext(owner) },
    );
    apolloExpect(updateChatTitleRes2, 'data', {
      updateChatGroupChatTitle: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, title: null }, expectedChatFormat],
      },
    });

    // clean up
    await Promise.all([jestRemoveObject(url), jestRemoveObject(url2)]);
  });
});
