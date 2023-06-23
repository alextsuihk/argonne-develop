/**
 * Jest: /resolvers/questions
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays, sub } from 'date-fns';

import {
  apolloExpect,
  ApolloServer,
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
  shuffle,
  testServer,
} from '../jest';
import Classroom from '../models/classroom';
import Level from '../models/level';
import Question from '../models/question';
import Subject from '../models/subject';
import Tenant from '../models/tenant';
import type { Id, UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_QUESTION,
  ADD_QUESTION_BID_CONTENT,
  ADD_QUESTION_BIDDERS,
  ADD_QUESTION_CONTENT_BY_STUDENT,
  ADD_QUESTION_CONTENT_BY_TUTOR,
  ADD_QUESTION_CONTENT_WITH_DISPUTE,
  ASSIGN_QUESTION_TUTOR,
  CLEAR_QUESTION_CHAT_FLAG,
  CLONE_QUESTION,
  CLOSE_QUESTION,
  GET_QUESTION,
  GET_QUESTIONS,
  REMOVE_QUESTION,
  SET_QUESTION_CHAT_FLAG,
  UPDATE_QUESTION_LAST_VIEWED_AT,
} from '../queries/question';
import { schoolYear } from '../utils/helper';

const { MSG_ENUM } = LOCALE;
const { QUESTION } = LOCALE.DB_ENUM;

// Top chat of this test suite:
describe('ChatGroup GraphQL', () => {
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUsers: (UserDocument & Id)[] | null;
  let tenantId: string | null;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    tenant: expect.any(String),
    parent: expect.toBeOneOf([null, expect.any(String)]),

    student: expect.any(String),
    tutor: expect.toBeOneOf([null, expect.any(String)]),
    marshals: expect.any(Array),
    members: expect.any(Array),
    deadline: expect.any(Number),

    classroom: expect.toBeOneOf([null, expect.any(String)]),
    level: expect.any(String),
    subject: expect.any(String),
    book: expect.toBeOneOf([null, expect.any(String)]),
    bookRev: expect.toBeOneOf([null, expect.any(String)]),
    chapter: expect.toBeOneOf([null, expect.any(String)]),
    assignmentIdx: expect.toBeOneOf([null, expect.any(Number)]),
    dynParamIdx: expect.toBeOneOf([null, expect.any(Number)]),
    homework: expect.toBeOneOf([null, expect.any(String)]),

    lang: expect.any(String),

    contents: expect.any(Array),
    timeSpent: expect.toBeOneOf([null, expect.any(Number)]),

    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),

    price: expect.toBeOneOf([null, expect.any(Number)]),
    bidders: expect.any(Array),
    bidContents: expect.any(Array), // contents: string[][]
    paidAt: expect.toBeOneOf([null, expect.any(Number)]),

    correctness: expect.any(Number),
    explicitness: expect.any(Number),
    punctuality: expect.any(Number),

    contentsToken: expect.any(String),
  };

  beforeAll(async () => {
    ({ guestServer, normalServer, normalUsers, tenantId } = await jestSetup(['admin', 'guest', 'normal'], {
      apollo: true,
    }));
  });

  afterAll(jestTeardown);

  test('should response a single object when GET One by ID (as student, bidder & tutor)', async () => {
    expect.assertions(6);

    const questions = await Question.find({ tenant: tenantId!, deletedAt: { $exists: false } }).lean();

    //! note: normalUsers are even odd or even indexed (1/2 of all users)
    const studentQuestion = questions.sort(shuffle).find(q => idsToString(normalUsers!).includes(q.student.toString()));
    const student = normalUsers!.find(u => u._id.toString() === studentQuestion?.student.toString());
    const bidderQuestion = questions
      .sort(shuffle)
      .find(q => idsToString(q.bidders).some(bidder => idsToString(normalUsers!).includes(bidder)));
    const bidder = normalUsers!.find(u => idsToString(bidderQuestion?.bidders ?? []).includes(u._id.toString()));
    const tutorQuestion = questions
      .sort(shuffle)
      .find(q => q.tutor && idsToString(normalUsers!).includes(q.tutor.toString()));
    const tutor = normalUsers!.find(u => u._id.toString() === tutorQuestion?.tutor?.toString());

    if (!student || !studentQuestion || !bidder || !bidderQuestion || !tutor || !tutorQuestion)
      throw `Insufficient Data for test: ${student?._id}, ${bidder?._id}, ${tutor?._id}`;

    const studentServer = testServer(student);
    const studentOneRes = await studentServer.executeOperation({
      query: GET_QUESTION,
      variables: { id: studentQuestion._id.toString() },
    });
    apolloExpect(studentOneRes, 'data', { question: expectedFormat });
    const studentManyRes = await studentServer.executeOperation({ query: GET_QUESTIONS });
    apolloExpect(studentManyRes, 'data', { questions: expect.arrayContaining([expectedFormat]) });

    const bidderServer = testServer(bidder);
    const bidderOneRes = await bidderServer.executeOperation({
      query: GET_QUESTION,
      variables: { id: bidderQuestion._id.toString() },
    });
    apolloExpect(bidderOneRes, 'data', { question: expectedFormat });
    const bidderManyRes = await bidderServer.executeOperation({ query: GET_QUESTIONS });
    apolloExpect(bidderManyRes, 'data', { questions: expect.arrayContaining([expectedFormat]) });

    const tutorServer = testServer(tutor);
    const tutorOneRes = await tutorServer.executeOperation({
      query: GET_QUESTION,
      variables: { id: tutorQuestion._id.toString() },
    });
    apolloExpect(tutorOneRes, 'data', { question: expectedFormat });
    const tutorManyRes = await tutorServer.executeOperation({ query: GET_QUESTIONS });
    apolloExpect(tutorManyRes, 'data', { questions: expect.arrayContaining([expectedFormat]) });
  });

  test('should fail when GET all (as guest)', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_QUESTIONS });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET One by ID (as guest)', async () => {
    expect.assertions(1);

    const chatGroup = await Question.findOne().lean();
    const res = await guestServer!.executeOperation({
      query: GET_QUESTION,
      variables: { id: chatGroup!._id.toString() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_QUESTION });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_QUESTION, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should when student creates and removes a question', async () => {
    expect.assertions(2);

    const userIds = idsToString(normalUsers!).slice(-2);

    const subject = await Subject.findOne({ deletedAt: { $exists: false } }).lean();
    const level = randomId(subject!.levels);
    const [lang] = Object.keys(QUESTION.LANG).sort(shuffle);
    const createdRes = await normalServer!.executeOperation({
      query: ADD_QUESTION,
      variables: {
        tenantId,
        userIds,
        deadline: addDays(Date.now(), 2),
        level,
        subject: subject!._id.toString(),
        lang,
        content: FAKE,
      },
    });

    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        tenant: tenantId!,
        parent: null,
        tutor: null,
        bidders: userIds,
        bidContents: [[], []],
        members: [{ user: normalUsers![0]._id.toString(), flags: [], lastViewedAt: expect.any(Number) }],
        contents: [expect.any(String)],
      },
    });

    const id = createdRes.data!.addQuestion._id;
    const removedRes = await normalServer!.executeOperation({ query: REMOVE_QUESTION, variables: { id } });
    apolloExpect(removedRes, 'data', { removeQuestion: { code: MSG_ENUM.COMPLETED } });
  });

  test('should when student creates and auto-assigns to a single tutor, but not allow to remove', async () => {
    expect.assertions(2);

    const [tutorId] = idsToString(normalUsers!).slice(-1);

    const subject = await Subject.findOne({ deletedAt: { $exists: false } }).lean();
    const level = randomId(subject!.levels);
    const [lang] = Object.keys(QUESTION.LANG).sort(shuffle);
    const createdRes = await normalServer!.executeOperation({
      query: ADD_QUESTION,
      variables: {
        tenantId,
        userIds: [tutorId],
        deadline: addDays(Date.now(), 2),
        level,
        subject: subject!._id.toString(),
        lang,
        content: FAKE,
      },
    });

    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        tenant: tenantId!,
        parent: null,
        tutor: tutorId,
        bidders: [],
        bidContents: [],
        members: [{ user: normalUsers![0]._id.toString(), flags: [], lastViewedAt: expect.any(Number) }],
        contents: [expect.any(String)],
      },
    });

    const id = createdRes.data!.addQuestion._id;
    const removedRes = await normalServer!.executeOperation({ query: REMOVE_QUESTION, variables: { id } });
    apolloExpect(removedRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test.only('should pass the full suite', async () => {
    // expect.assertions(21);

    const classrooms = await Classroom.find({ tenant: tenantId! }).lean();

    const classroom = classrooms
      .sort(shuffle)
      .find(({ students }) => idsToString(students).find(studentId => idsToString(normalUsers!).includes(studentId)));
    if (!classroom) throw 'no valid classroom for testing';

    const student = normalUsers!.find(user => idsToString(classroom.students).includes(user._id.toString()));
    const studentId = student!._id.toString();
    const studentServer = testServer(student);

    const [newBidderId, ...bidderIds] = idsToString(normalUsers!)
      .filter(user => user.toString() !== studentId)
      .slice(-3);

    const create = {
      tenantId,
      userIds: bidderIds,
      deadline: addDays(Date.now(), 2),
      level: classroom.level.toString(),
      subject: classroom.subject.toString(),
      ...(classroom.books.length && { book: randomId(classroom.books) }),
      ...(prob(0.5) && { bookRev: `rev-${FAKE}` }),
      lang: randomId(Object.keys(QUESTION.LANG)),
    };
    const createdRes = await studentServer.executeOperation({
      query: ADD_QUESTION,
      variables: { ...create, content: FAKE },
    });

    // student submits a question
    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        tenant: tenantId!,
        parent: null,
        tutor: null,
        bidders: bidderIds,
        bidContents: bidderIds.map(_ => []),
        members: [{ user: studentId, flags: [], lastViewedAt: expect.any(Number) }],
        contents: [expect.any(String)],
      },
    });

    const newId: string = createdRes.data!.addQuestion._id;

    // (second) bidder1 addBidContent
    const bidder1Server = testServer(normalUsers!.find(user => user._id.toString() === bidderIds[1]));
    const addBidContent11Res = await bidder1Server.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE, userId: bidderIds[1] },
    });
    apolloExpect(addBidContent11Res, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidders: [bidderIds[1]], // bidder1 only sees himself
        bidContents: [[expect.any(String)]], // bidder1 only sees his bidContents
      },
    });

    // student addBidContent to bidder0 (first bidder)
    const studentAddBidContent0 = await studentServer.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE2, userId: bidderIds[0] },
    });
    apolloExpect(studentAddBidContent0, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidders: bidderIds, // student able to see all bidders
        bidContents: [[expect.any(String)], [expect.any(String)]],
      },
    });

    // student addBidders
    const studentAddBidders = await studentServer.executeOperation({
      query: ADD_QUESTION_BIDDERS,
      variables: { id: newId, userIds: [newBidderId] },
    });
    apolloExpect(studentAddBidders, 'data', {
      addQuestionBidders: {
        ...expectedFormat,
        bidders: [...bidderIds, newBidderId], // student able to see all bidders
      },
    });

    // students addBidContent to new bidder
    const studentAddBidContent2 = await studentServer.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE2, userId: newBidderId },
    });
    apolloExpect(studentAddBidContent2, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidContents: [[expect.any(String)], [expect.any(String)], [expect.any(String)]],
      },
    });

    // student addBidContent to bidder1 (second bidder)
    const studentAddBidContent1 = await studentServer.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE2, userId: bidderIds[1] },
    });
    apolloExpect(studentAddBidContent1, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidContents: [[expect.any(String)], [expect.any(String), expect.any(String)], [expect.any(String)]], // second bidder has two bidContents
      },
    });

    // student addContent
    const studentAddContent0 = await studentServer.executeOperation({
      query: ADD_QUESTION_CONTENT_BY_STUDENT,
      variables: { id: newId, content: FAKE },
    });
    apolloExpect(studentAddContent0, 'data', {
      addQuestionContentByStudent: { ...expectedFormat, contents: [expect.any(String), expect.any(String)] }, // two contents now
    });

    // student assignTutor (to newBidderId)
    const studentAssignTutor = await studentServer.executeOperation({
      query: ASSIGN_QUESTION_TUTOR,
      variables: { id: newId, userId: newBidderId },
    });
    apolloExpect(studentAssignTutor, 'data', {
      assignQuestionTutor: { ...expectedFormat, tutor: newBidderId },
    });

    // newBidderId addContent
    const bidder2Server = testServer(normalUsers!.find(user => user._id.toString() === newBidderId));

    // bidder0 is able to see ONLY two contents

    //   const [, , , user2, , join] = normalUsers!;
    //   const [ownerId, user0Id, user1Id, user2Id, user3Id, joinId] = idsToString(normalUsers!);
    //   const ownerServer = normalServer!;

    //   [url, url2] = await Promise.all([jestPutObject(normalUser!._id), jestPutObject(normalUser!._id)]);

    //   const create = {
    //     membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
    //     ...(prob(0.5) && { title: FAKE }),
    //     ...(prob(0.5) && { description: FAKE }),
    //     ...(prob(0.5) && { logoUrl: url }),
    //   };

    //   // (owner) add ChatGroup
    //   const createdRes = await ownerServer.executeOperation({
    //     query: ADD_CHAT_GROUP,
    //     variables: { tenantId: tenantId!, userIds: [user0Id], ...create },
    //   });
    //   apolloExpect(createdRes, 'data', {
    //     addChatGroup: {
    //       ...expectedFormat,
    //       ...create,
    //       tenant: tenantId!,
    //       admins: [ownerId],
    //       users: [ownerId, user0Id],
    //       chats: [],
    //     },
    //   });
    //   const newId: string = createdRes.data!.addChatGroup._id;

    //   // (owner) update users
    //   const updateUsersRes = await ownerServer.executeOperation({
    //     query: UPDATE_CHAT_GROUP_USERS,
    //     variables: { id: newId, userIds: [user1Id, user2Id] },
    //   });
    //   apolloExpect(updateUsersRes, 'data', {
    //     updateChatGroupUsers: {
    //       ...expectedFormat,
    //       admins: [ownerId],
    //       users: [ownerId, user1Id, user2Id],
    //       chats: [],
    //     },
    //   });

    //   // (owner) promote 1 user to admin
    //   const addAdminsRes = await ownerServer.executeOperation({
    //     query: UPDATE_CHAT_GROUP_ADMINS,
    //     variables: { id: newId, userIds: [user1Id] },
    //   });
    //   apolloExpect(addAdminsRes, 'data', {
    //     updateChatGroupAdmins: { ...expectedFormat, admins: [ownerId, user1Id], chats: [] },
    //   });

    //   // (joinUser) should fail when joining CLOSED membership
    //   const joinServer = testServer(join);
    //   const joinFailRes = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    //   apolloExpect(joinFailRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    //   // (user2) for CLOSED-MEMBERSHIP, should fail when regular user (user2) tries to addUsers
    //   const user2Server = testServer(user2);
    //   const addUsersFailRes = await user2Server.executeOperation({
    //     query: UPDATE_CHAT_GROUP_USERS,
    //     variables: { id: newId, userIds: [user3Id] },
    //   });
    //   apolloExpect(addUsersFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    //   // (owner) change to NORMAL-MEMBERSHIP & remove logoUrl
    //   const updatedRes = await ownerServer.executeOperation({
    //     query: UPDATE_CHAT_GROUP,
    //     variables: { id: newId, title: FAKE2, description: FAKE2, membership: CHAT_GROUP.MEMBERSHIP.NORMAL, logoUrl: '' },
    //   });
    //   apolloExpect(updatedRes, 'data', {
    //     updateChatGroup: {
    //       ...expectedFormat,
    //       title: FAKE2,
    //       description: FAKE2,
    //       membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
    //       logoUrl: null, // logoUrl is removed
    //       chats: [],
    //     },
    //   });

    //   // (user2) for NORMAL-MEMBERSHIP, any existing user could add new users
    //   const addUsers2Res = await user2Server.executeOperation({
    //     query: UPDATE_CHAT_GROUP_USERS,
    //     variables: { id: newId, userIds: [ownerId, user0Id, user1Id, user3Id] },
    //   });
    //   apolloExpect(addUsers2Res, 'data', {
    //     updateChatGroupUsers: {
    //       ...expectedFormat,
    //       users: [user2Id, ownerId, user0Id, user1Id, user3Id],
    //       chats: [],
    //     },
    //   });

    //   // (joinUser) should fail when joining non PUBLIC membership
    //   const joinFail2Res = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    //   apolloExpect(joinFail2Res, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    //   // (owner) change to PUBLIC-MEMBERSHIP & add logoUrl back
    //   const updated2Res = await ownerServer.executeOperation({
    //     query: UPDATE_CHAT_GROUP,
    //     variables: { id: newId, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2 },
    //   });
    //   apolloExpect(updated2Res, 'data', {
    //     updateChatGroup: { ...expectedFormat, membership: CHAT_GROUP.MEMBERSHIP.PUBLIC, logoUrl: url2, chats: [] },
    //   });

    //   // (joinUser) should pass when joining a PUBLIC-MEMBERSHIP
    //   const joinRes = await joinServer.executeOperation({ query: JOIN_CHAT_GROUP, variables: { id: newId } });
    //   apolloExpect(joinRes, 'data', {
    //     joinChatGroup: {
    //       ...expectedFormat,
    //       users: [user2Id, ownerId, user0Id, user1Id, user3Id, joinId],
    //       chats: [],
    //     },
    //   });

    //   // (joinUser) should pass when leaving chatGroup
    //   const leaveRes = await joinServer.executeOperation({ query: LEAVE_CHAT_GROUP, variables: { id: newId } });
    //   apolloExpect(leaveRes, 'data', { leaveChatGroup: { code: MSG_ENUM.COMPLETED } });

    //   // (owner) addContentWithNewChat
    //   const addContentWithNewChatRes = await ownerServer.executeOperation({
    //     query: ADD_CHAT_GROUP_CONTENT_WITH_NEW_CHAT,
    //     variables: { id: newId, content: FAKE },
    //   });
    //   apolloExpect(addContentWithNewChatRes, 'data', {
    //     addChatGroupContentWithNewChat: {
    //       ...expectedFormat,
    //       chats: [{ ...expectChatFormatEx, contents: [expect.any(String)], ...expectedMember(ownerId, true) }],
    //     },
    //   });
    //   const chatId = addContentWithNewChatRes.data!.addChatGroupContentWithNewChat.chats[0]._id.toString();

    //   // (user2) addContent (append to first chat)
    //   const addContentRes = await user2Server.executeOperation({
    //     query: ADD_CHAT_GROUP_CONTENT,
    //     variables: { id: newId, chatId, content: FAKE },
    //   });
    //   apolloExpect(addContentRes, 'data', {
    //     addChatGroupContent: {
    //       ...expectedFormat,
    //       chats: [{ ...expectChatFormatEx, contents: [expect.any(String), expect.any(String)] }],
    //     },
    //   });
    //   const contentIds = addContentRes.data?.addChatGroupContent.chats[0].contents;

    //   // (user2) addContentWithNewChat
    //   const addContentWithNewChatRes2 = await user2Server.executeOperation({
    //     query: ADD_CHAT_GROUP_CONTENT_WITH_NEW_CHAT,
    //     variables: { id: newId, content: FAKE },
    //   });
    //   apolloExpect(addContentWithNewChatRes2, 'data', {
    //     addChatGroupContentWithNewChat: {
    //       ...expectedFormat,
    //       chats: [
    //         { ...expectChatFormatEx, contents: [expect.any(String), expect.any(String)] },
    //         { ...expectChatFormatEx, contents: [expect.any(String)], ...expectedMember(user2Id, true) },
    //       ],
    //     },
    //   });

    //   // (owner) recall first content of first chat (his owner content)
    //   const recallContentRes = await ownerServer.executeOperation({
    //     query: RECALL_CHAT_GROUP_CONTENT,
    //     variables: { id: newId, chatId, contentId: contentIds[0] },
    //   });
    //   apolloExpect(recallContentRes, 'data', {
    //     recallChatGroupContent: {
    //       ...expectedFormat,
    //       chats: [
    //         { ...expectChatFormatEx, contents: [expect.any(String), expect.any(String)] },
    //         { ...expectChatFormatEx, contents: [expect.any(String)], ...expectedMember(user2Id, true) },
    //       ],
    //     },
    //   });

    //   // (owner) recall second content of first chat (user2's content)
    //   const blockContentRes = await ownerServer.executeOperation({
    //     query: BLOCK_CHAT_GROUP_CONTENT,
    //     variables: { id: newId, chatId, contentId: contentIds[1] },
    //   });
    //   apolloExpect(blockContentRes, 'data', {
    //     blockChatGroupContent: {
    //       ...expectedFormat,
    //       chats: [
    //         { ...expectChatFormatEx, contents: [expect.any(String), expect.any(String)] },
    //         { ...expectChatFormatEx, contents: [expect.any(String)], ...expectedMember(user2Id, true) },
    //       ],
    //     },
    //   });

    //   // (owner) set chat flag
    //   const flag = CHAT.MEMBER.FLAG.IMPORTANT;
    //   const setChatFlagRes = await ownerServer.executeOperation({
    //     query: SET_CHAT_GROUP_CHAT_FLAG,
    //     variables: { id: newId, chatId, flag },
    //   });
    //   apolloExpect(setChatFlagRes, 'data', {
    //     setChatGroupChatFlag: {
    //       ...expectedFormat,
    //       chats: [
    //         {
    //           ...expectChatFormatEx,
    //           contents: [expect.any(String), expect.any(String)],
    //           members: [{ user: ownerId, flags: [flag], lastViewedAt: expect.any(Number) }],
    //         },
    //         { ...expectChatFormatEx, contents: [expect.any(String)] },
    //       ],
    //     },
    //   });

    //   // (owner) clear chat flag
    //   const clearChatFlagRes = await ownerServer.executeOperation({
    //     query: CLEAR_CHAT_GROUP_CHAT_FLAG,
    //     variables: { id: newId, chatId, flag },
    //   });
    //   apolloExpect(clearChatFlagRes, 'data', {
    //     clearChatGroupChatFlag: {
    //       ...expectedFormat,
    //       chats: [
    //         {
    //           ...expectChatFormatEx,
    //           contents: [expect.any(String), expect.any(String)],
    //           members: [{ user: ownerId, flags: [], lastViewedAt: expect.any(Number) }],
    //         },
    //         { ...expectChatFormatEx, contents: [expect.any(String)] },
    //       ],
    //     },
    //   });

    //   // (user2) update chat lastViewedAt
    //   const updateLatViewedAtRes = await user2Server.executeOperation({
    //     query: UPDATE_CHAT_GROUP_CHAT_LAST_VIEWED_AT,
    //     variables: { id: newId, chatId },
    //   });
    //   apolloExpect(updateLatViewedAtRes, 'data', {
    //     updateChatGroupChatLastViewedAt: {
    //       ...expectedFormat,
    //       chats: [
    //         {
    //           ...expectChatFormatEx,
    //           contents: [expect.any(String), expect.any(String)],
    //           members: [
    //             { user: ownerId, flags: [], lastViewedAt: expect.any(Number) },
    //             { user: user2Id, flags: [], lastViewedAt: expect.any(Number) },
    //           ],
    //         },
    //         { ...expectChatFormatEx, contents: [expect.any(String)] },
    //       ],
    //     },
    //   });

    //   // (owner) set chat title
    //   const updateChatTitleRes = await ownerServer.executeOperation({
    //     query: UPDATE_CHAT_GROUP_CHAT_TITLE,
    //     variables: { id: newId, chatId, title: FAKE },
    //   });
    //   apolloExpect(updateChatTitleRes, 'data', {
    //     updateChatGroupChatTitle: {
    //       ...expectedFormat,
    //       chats: [{ ...expectChatFormatEx, title: FAKE }, expectChatFormatEx],
    //     },
    //   });

    //   // (owner) unset chat title
    //   const updateChatTitleRes2 = await ownerServer.executeOperation({
    //     query: UPDATE_CHAT_GROUP_CHAT_TITLE,
    //     variables: { id: newId, chatId },
    //   });
    //   apolloExpect(updateChatTitleRes2, 'data', {
    //     updateChatGroupChatTitle: {
    //       ...expectedFormat,
    //       chats: [{ ...expectChatFormatEx, title: null }, expectChatFormatEx],
    //     },
    //   });
  });
});
