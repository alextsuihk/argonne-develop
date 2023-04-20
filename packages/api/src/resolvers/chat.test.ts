/**
 * Jest: /resolvers/chat
 *
 */

import { CONTENT_PREFIX, LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import {
  apolloExpect,
  ApolloServer,
  expectedIdFormat,
  FAKE,
  FAKE2,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
  shuffle,
  testServer,
} from '../jest';
import type { ChatDocument } from '../models/chat';
import type { ChatGroupDocument } from '../models/chat-group';
import ChatGroup from '../models/chat-group';
import type { ClassroomDocument } from '../models/classroom';
import Classroom from '../models/classroom';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_CHAT,
  ATTACH_CHAT_TO_CLASSROOM,
  BLOCK_CHAT_CONTENT,
  CLEAR_CHAT_FLAG,
  GET_CHAT,
  GET_CHATS,
  GET_CONTENT,
  RECALL_CHAT_CONTENT,
  SET_CHAT_FLAG,
  UPDATE_CHAT_LAST_VIEWED_AT,
  UPDATE_CHAT_TITLE,
} from '../queries/chat';
import { schoolYear } from '../utils/helper';

const { MSG_ENUM } = LOCALE;
const { CHAT } = LOCALE.DB_ENUM;

// Top chat of this test suite:
describe('Chat GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: LeanDocument<UserDocument> | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let tenantId: string | null;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    parents: expect.arrayContaining([expect.any(String)]),
    title: expect.toBeOneOf([null, expect.any(String)]),

    members: expect.arrayContaining([
      {
        user: expect.any(String),
        flags: expect.any(Array),
        lastViewedAt: expect.toBeOneOf([null, expect.any(Number)]),
      },
    ]),

    contents: expect.arrayContaining([expect.any(String)]),
    contentsToken: expect.any(String),

    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  };

  const expectedContentFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    parents: expect.arrayContaining([expect.any(String)]),
    creator: expect.any(String),
    data: expect.any(String),

    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  };

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer, normalUsers, tenantId } = await jestSetup(
      ['admin', 'guest', 'normal', 'tenantAdmin'],
      { apollo: true },
    ));
  });

  afterAll(jestTeardown);

  // common test: testing GetAll, GetById, invalidId, nonExistingId
  const getMany = async (server: ApolloServer, adminId?: string) => {
    expect.assertions(6);

    // get many
    const chatsRes = await server.executeOperation({ query: GET_CHATS });
    apolloExpect(chatsRes, 'data', { chats: expect.arrayContaining([expectedFormat]) });

    // get one
    const randId = adminId
      ? randomId(
          (chatsRes.data!.chats as ChatDocument[]).filter(
            chat => !chat.members.map(m => m.user.toString()).includes(adminId),
          ),
        ) // for admin, find an admin-message
      : randomId(chatsRes.data!.chats);

    const chatRes = await server.executeOperation({ query: GET_CHAT, variables: { id: randId } });
    apolloExpect(chatRes, 'data', { chat: expectedFormat });

    // get one of the contents
    const { _id, contents, contentsToken } = chatRes.data!.chat;
    const contentRes = await server.executeOperation({
      query: GET_CONTENT,
      variables: { id: randomId(contents), token: contentsToken },
    });
    apolloExpect(contentRes, 'data', { content: expectedContentFormat });
    expect(contentRes.data!.content.parents.includes(`/chats/${_id}`)).toBeTrue();

    // fail with invalid ID
    const invalidIdRes = await server.executeOperation({ query: GET_CHAT, variables: { id: 'INVALID-ID' } });
    apolloExpect(invalidIdRes, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);

    // return empty arrays with nonExistingId
    const nonExistingId = new mongoose.Types.ObjectId().toString();
    const nonExistingIdRes = await server.executeOperation({ query: GET_CHAT, variables: { id: nonExistingId } });
    apolloExpect(nonExistingIdRes, 'data', { chat: null });
  };

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as normalUser)', async () =>
    getMany(normalServer!));

  test('should pass when testing GetAll, GetById, invalidId, nonExistingId (as admin)', async () =>
    getMany(adminServer!, adminUser!._id.toString()));

  test('should fail when GET without authentication', async () => {
    expect.assertions(2);

    const res = await guestServer!.executeOperation({ query: GET_CHATS });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const validId = new mongoose.Types.ObjectId().toString();
    const res2 = await guestServer!.executeOperation({ query: GET_CHAT, variables: { id: validId } });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  const commonFullSuite = async (type: 'chatGroup' | 'classroom') => {
    expect.assertions(15);

    const classrooms = await Classroom.find({ tenant: tenantId!, deletedAt: { $exists: false } }).lean();
    const [attachingClassroom] = classrooms.sort(shuffle);
    const teacherId = randomId(attachingClassroom!.teachers);
    const teacher = await User.findOneActive({ _id: teacherId });
    const teacherServer = testServer(teacher!);
    if (!teacher) throw 'There is no appropriate teacher';

    const user = normalUsers!.find(user => user._id.toString() !== teacherId);
    const userServer = testServer(user!);
    const userId = user!._id.toString();

    const parentDoc =
      type === 'chatGroup'
        ? await ChatGroup.create<Partial<ChatGroupDocument>>({
            tenant: tenantId!,
            title: `Chat Test (apollo)`,
            admins: [teacherId],
            users: [teacherId, userId],
            chats: [],
          })
        : await Classroom.create<Partial<ClassroomDocument>>({
            tenant: tenantId!,
            year: schoolYear(),
            teachers: [teacherId],
            students: [userId],
          });
    const parent = `/${type}s/${parentDoc._id}`;

    // (teacher) add a new chat (as a chatAdmin)
    const titleProb = prob(0.5);
    const addContentRes = await teacherServer.executeOperation({
      query: ADD_CHAT,
      variables: { ...(titleProb && { title: `FAKE(1)` }), parent, content: FAKE },
    });
    apolloExpect(addContentRes, 'data', {
      addChat: {
        ...expectedFormat,
        ...(titleProb && { title: `FAKE(1)` }),
        parents: [parent],
        members: [
          { user: teacherId, flags: [], lastViewedAt: expect.any(Number) },
          { user: userId, flags: [], lastViewedAt: null },
        ],
        contents: [expect.any(String)], // ONE content is created
      },
    });
    const chatId = addContentRes.data!.addChat._id.toString();

    // (user) updates lastViewedAt
    const timestamp = new Date();
    const updateLastViewedAtRes = await userServer.executeOperation({
      query: UPDATE_CHAT_LAST_VIEWED_AT,
      variables: { id: chatId, parent, timestamp },
    });
    apolloExpect(updateLastViewedAtRes, 'data', {
      updateChatLastViewedAt: {
        ...expectedFormat,
        contentsToken: null,
        members: [
          { user: teacherId, flags: [], lastViewedAt: expect.any(Number) },
          { user: userId, flags: [], lastViewedAt: timestamp.getTime() },
        ],
      },
    });

    // (user) appends more content, and recalls, and check the updated content
    const addContent2Res = await userServer.executeOperation({
      query: ADD_CHAT,
      variables: { id: chatId, parent, content: FAKE2 },
    });
    apolloExpect(addContent2Res, 'data', {
      addChat: { ...expectedFormat, contents: [expect.any(String), expect.any(String)] },
    }); // TWO contents
    const [, contentId] = addContent2Res.data!.addChat.contents; // the second content

    const recallContentRes = await userServer.executeOperation({
      query: RECALL_CHAT_CONTENT,
      variables: { id: chatId, parent, contentId },
    });
    apolloExpect(recallContentRes, 'data', {
      recallChatContent: { ...expectedFormat, contents: [expect.any(String), expect.any(String)] },
    });

    const recallChatContentRes = await userServer.executeOperation({
      query: GET_CONTENT,
      variables: { id: contentId!, token: recallContentRes.data!.recallChatContent.contentsToken },
    });
    apolloExpect(recallChatContentRes, 'data', { content: expectedContentFormat });
    expect(
      recallChatContentRes.data!.content.data.startsWith(CONTENT_PREFIX.RECALLED) &&
        recallChatContentRes.data!.content.data.endsWith(userId),
    ).toBeTrue();

    // (user) appends more contents, but blocks by chatGroup.admin or classroom.teacher
    const addContent3Res = await userServer.executeOperation({
      query: ADD_CHAT,
      variables: { id: chatId, parent, content: `3rd Content` },
    });
    apolloExpect(addContent3Res, 'data', {
      addChat: { ...expectedFormat, contents: [expect.any(String), expect.any(String), expect.any(String)] },
    }); // THREE contents
    const [, , content2Id] = addContent3Res.data!.addChat.contents; // the third content

    // (user who is not a chatAdmin) should fail to block content (even his own)
    const blockContentFailRes = await userServer.executeOperation({
      query: BLOCK_CHAT_CONTENT,
      variables: { id: chatId, parent, contentId: content2Id!, remark: FAKE },
    });
    apolloExpect(blockContentFailRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // (teacher as chatAdmin) could block content & check content
    const blockContentRes = await teacherServer.executeOperation({
      query: BLOCK_CHAT_CONTENT,
      variables: { id: chatId, parent, contentId: content2Id!, remark: FAKE },
    });
    apolloExpect(blockContentRes, 'data', {
      blockChatContent: { ...expectedFormat, contents: [expect.any(String), expect.any(String), expect.any(String)] },
    });

    const blockChatContentRes = await teacherServer.executeOperation({
      query: GET_CONTENT,
      variables: { id: content2Id!, token: blockContentRes.data!.blockChatContent.contentsToken },
    });
    apolloExpect(blockChatContentRes, 'data', { content: expectedContentFormat });
    expect(
      blockChatContentRes.data!.content.data.startsWith(CONTENT_PREFIX.BLOCKED) &&
        blockChatContentRes.data!.content.data.endsWith(teacherId),
    ).toBeTrue();

    // (user) setFlag
    const setFlagRes = await userServer.executeOperation({
      query: SET_CHAT_FLAG,
      variables: { id: chatId, parent, flag: CHAT.MEMBER.FLAG.IMPORTANT },
    });
    apolloExpect(setFlagRes, 'data', {
      setChatFlag: {
        ...expectedFormat,
        contentsToken: null,
        members: [
          { user: teacherId, flags: [], lastViewedAt: expect.any(Number) },
          { user: userId, flags: [CHAT.MEMBER.FLAG.IMPORTANT], lastViewedAt: expect.any(Number) },
        ],
      },
    });

    // (user) clearFlag
    const clearFlagRes = await userServer.executeOperation({
      query: CLEAR_CHAT_FLAG,
      variables: { id: chatId, parent, flag: CHAT.MEMBER.FLAG.IMPORTANT },
    });
    apolloExpect(clearFlagRes, 'data', {
      clearChatFlag: {
        ...expectedFormat,
        contentsToken: null,
        members: [
          { user: teacherId, flags: [], lastViewedAt: expect.any(Number) },
          { user: userId, flags: [], lastViewedAt: expect.any(Number) },
        ],
      },
    });

    // (teacher as chatAdmin) update title
    const updateTitleRes = await teacherServer.executeOperation({
      query: UPDATE_CHAT_TITLE,
      variables: { id: chatId, parent, title: FAKE2 },
    });
    apolloExpect(updateTitleRes, 'data', {
      updateChatTitle: {
        ...expectedFormat,
        contentsToken: null,
        title: FAKE2,
      },
    });

    // (teacher) attach this chat to another classroom
    const attachRes = await teacherServer.executeOperation({
      query: ATTACH_CHAT_TO_CLASSROOM,
      variables: { id: chatId, parent, classroomId: attachingClassroom._id.toString() },
    });
    apolloExpect(attachRes, 'data', {
      attachChatToClassroom: {
        ...expectedFormat,
        contentsToken: null,
        parents: [parent, `/classrooms/${attachingClassroom._id.toString()}`],
      },
    });

    // clean up
    type === 'chatGroup'
      ? await ChatGroup.findByIdAndUpdate(parentDoc._id, { deletedAt: new Date() })
      : await Classroom.findByIdAndUpdate(parentDoc._id, { deletedAt: new Date() });
  };

  test('should pass the full suite (chatGroup)', async () => commonFullSuite('chatGroup'));
  test('should pass the full suite (classroom)', async () => commonFullSuite('classroom'));
});
