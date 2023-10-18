/**
 * Jest: /resolvers/questions
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import {
  apolloExpect,
  ApolloServer,
  expectedDateFormat,
  expectedIdFormat,
  expectedMember,
  FAKE,
  FAKE2,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  shuffle,
  testServer,
} from '../jest';
import Classroom from '../models/classroom';
import Question from '../models/question';
import Subject from '../models/subject';
import type { UserDocument } from '../models/user';
import {
  ADD_QUESTION,
  ADD_QUESTION_BID_CONTENT,
  ADD_QUESTION_BIDDERS,
  ADD_QUESTION_CONTENT,
  ASSIGN_QUESTION_TUTOR,
  CLEAR_QUESTION_FLAG,
  CLONE_QUESTION,
  CLOSE_QUESTION,
  GET_QUESTION,
  GET_QUESTIONS,
  REMOVE_QUESTION,
  SET_QUESTION_FLAG,
  UPDATE_QUESTION_LAST_VIEWED_AT,
  UPDATE_QUESTION_RANKING,
} from '../queries/question';

const { MSG_ENUM } = LOCALE;
const { QUESTION } = LOCALE.DB_ENUM;

// Top chat of this test suite:
describe('ChatGroup GraphQL', () => {
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUsers: UserDocument[] | null;
  let tenantId: string | null;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    tenant: expectedIdFormat,
    parent: expect.toBeOneOf([null, expect.any(String)]),

    student: expectedIdFormat,
    tutor: expect.toBeOneOf([null, expectedIdFormat]),
    marshals: expect.any(Array),
    members: expect.any(Array),
    deadline: expectedDateFormat(true),

    classroom: expect.toBeOneOf([null, expectedIdFormat]),
    level: expectedIdFormat,
    subject: expectedIdFormat,
    book: expect.toBeOneOf([null, expectedIdFormat]),
    bookRev: expect.toBeOneOf([null, expect.any(String)]),
    chapter: expect.toBeOneOf([null, expect.any(String)]),
    assignmentIdx: expect.toBeOneOf([null, expect.any(Number)]),
    dynParamIdx: expect.toBeOneOf([null, expect.any(Number)]),
    homework: expect.toBeOneOf([null, expectedIdFormat]),

    lang: expect.any(String),

    contents: expect.arrayContaining([expectedIdFormat]), // must have at least one content
    timeSpent: expect.toBeOneOf([null, expect.any(Number)]),

    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),

    price: expect.toBeOneOf([null, expect.any(Number)]),
    bidders: expect.any(Array),
    bids: expect.any(Array),
    paidAt: expect.toBeOneOf([null, expectedDateFormat(true)]),

    correctness: expect.toBeOneOf([null, expect.any(Number)]),
    explicitness: expect.toBeOneOf([null, expect.any(Number)]),
    punctuality: expect.toBeOneOf([null, expect.any(Number)]),

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

    const q = await Question.find({ tenant: tenantId!, deletedAt: { $exists: false } }).lean();
    const questions = q.sort(shuffle);

    const studentQuestion = questions.find(q => normalUsers!.some(u => u._id.equals(q.student)));
    const student = normalUsers!.find(u => studentQuestion?.student.equals(u._id));
    const bidderQuestion = questions.find(q => q.bidders.some(bidder => normalUsers!.some(u => u._id.equals(bidder))));
    const bidder = normalUsers!.find(u => bidderQuestion?.bidders?.some(b => b.equals(u._id)));
    const tutorQuestion = questions.find(q => normalUsers!.some(u => q.tutor && u._id.equals(q.tutor)));
    const tutor = normalUsers!.find(u => tutorQuestion?.tutor?.equals(u._id));

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
    apolloExpect(bidderOneRes, 'data', {
      question: { ...expectedFormat, bidders: expect.arrayContaining([bidder._id.toString()]) },
    });
    const bidderManyRes = await bidderServer.executeOperation({ query: GET_QUESTIONS });
    apolloExpect(bidderManyRes, 'data', {
      questions: expect.arrayContaining([
        { ...expectedFormat, bidders: expect.arrayContaining([bidder._id.toString()]) },
      ]),
    });

    const tutorServer = testServer(tutor);
    const tutorOneRes = await tutorServer.executeOperation({
      query: GET_QUESTION,
      variables: { id: tutorQuestion._id.toString() },
    });
    apolloExpect(tutorOneRes, 'data', { question: { ...expectedFormat, tutor: tutor._id.toString() } });
    const tutorManyRes = await tutorServer.executeOperation({ query: GET_QUESTIONS });
    apolloExpect(tutorManyRes, 'data', {
      questions: expect.arrayContaining([{ ...expectedFormat, tutor: tutor._id.toString() }]),
    });
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

  test('should pass when student creates and removes a question', async () => {
    expect.assertions(2);

    const userIds = normalUsers!
      .slice(-2)
      .map(u => u._id.toString())
      .sort();

    const subject = await Subject.findOne({ deletedAt: { $exists: false } }).lean();
    const create = {
      level: randomItem(subject!.levels)._id.toString(),
      subject: subject!._id.toString(),
      lang: randomItem(Object.keys(QUESTION.LANG)),
    };
    const createdRes = await normalServer!.executeOperation({
      query: ADD_QUESTION,
      variables: { ...create, tenantId, userIds, deadline: addDays(Date.now(), 2), content: FAKE },
    });

    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        ...create,
        tenant: tenantId!,
        parent: null,
        tutor: null,
        bidders: userIds,
        bids: [],
        members: [expectedMember(normalUsers![0]._id, [], true)],
        contents: [expect.any(String)],
      },
    });

    const id = createdRes.data!.addQuestion._id;
    const removedRes = await normalServer!.executeOperation({ query: REMOVE_QUESTION, variables: { id } });
    apolloExpect(removedRes, 'data', { removeQuestion: { code: MSG_ENUM.COMPLETED } });
  });

  test('should pass when student creates and auto-assigns to a single tutor, but not allow to remove', async () => {
    expect.assertions(2);

    const tutorId = normalUsers!.at(-1)!._id.toString(); // pick the last user

    const subject = await Subject.findOne({ deletedAt: { $exists: false } }).lean();
    const create = {
      level: randomItem(subject!.levels)._id.toString(),
      subject: subject!._id.toString(),
      lang: randomItem(Object.keys(QUESTION.LANG)),
    };
    const createdRes = await normalServer!.executeOperation({
      query: ADD_QUESTION,
      variables: { ...create, tenantId, userIds: [tutorId], deadline: addDays(Date.now(), 2), content: FAKE },
    });

    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        ...create,
        tenant: tenantId!,
        parent: null,
        tutor: tutorId,
        bidders: [],
        bids: [],
        members: [expectedMember(normalUsers![0]._id, [], true)],
        contents: [expect.any(String)],
      },
    });

    const id = createdRes.data!.addQuestion._id;
    const removedRes = await normalServer!.executeOperation({ query: REMOVE_QUESTION, variables: { id } });
    apolloExpect(removedRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should pass the full suite', async () => {
    expect.assertions(20);

    const flag = QUESTION.MEMBER.FLAG.IMPORTANT;

    const classrooms = await Classroom.find({ tenant: tenantId! }).lean();

    const classroom = classrooms
      .sort(shuffle)
      .find(({ students }) => students.find(student => normalUsers!.some(u => u._id.equals(student))));
    const student = normalUsers!.find(user => classroom?.students.some(s => s.equals(user._id)));
    if (!classroom || !student) throw `no valid classroom (${classroom?._id}) or student ${student?._id} for testing`;

    const studentId = student._id.toString();
    const studentServer = testServer(student);

    const [newBidderId, ...bidderIds] = normalUsers!
      .filter(user => !user._id.equals(studentId))
      .slice(-3)
      .map(u => u._id.toString())
      .sort();

    const create = {
      classroom: classroom._id.toString(),
      level: classroom.level.toString(),
      subject: classroom.subject.toString(),
      ...(classroom.books.length && { book: randomItem(classroom.books).toString() }),
      ...(classroom.books.length && prob(0.5) && { bookRev: `rev-${FAKE}` }),
      lang: randomItem(Object.keys(QUESTION.LANG)),
    };

    // student submits a question
    const createdRes = await studentServer.executeOperation({
      query: ADD_QUESTION,
      variables: { ...create, tenantId, userIds: bidderIds, deadline: addDays(Date.now(), 2), content: FAKE },
    });
    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        ...create,
        tenant: tenantId!,
        parent: null,
        tutor: null,
        bidders: bidderIds,
        bids: [],
        members: [expectedMember(studentId, [], true)],
        contents: [expect.any(String)],
      },
    });

    const newId: string = createdRes.data!.addQuestion._id;

    // (second) bidder1 addBidContent
    const bidder1Server = testServer(normalUsers!.find(user => user._id.equals(bidderIds[1])));
    const bidder1AddBidContentRes = await bidder1Server.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE, userId: bidderIds[1] },
    });
    apolloExpect(bidder1AddBidContentRes, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidders: [bidderIds[1]], // bidder1 only sees himself
        bids: [
          { bidder: bidderIds[1], price: expect.toBeOneOf([null, expect.any(Number)]), contents: [expect.any(String)] },
        ], // bidder1 only sees his bidContents
      },
    });

    // student addBidContent to bidder0 (first bidder)
    const studentAddBidContentToBidder0Res = await studentServer.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE2, userId: bidderIds[0] },
    });
    apolloExpect(studentAddBidContentToBidder0Res, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidders: bidderIds, // student able to see all bidders
        bids: [
          { bidder: bidderIds[1], price: expect.toBeOneOf([null, expect.any(Number)]), contents: [expect.any(String)] },
          { bidder: bidderIds[0], price: expect.toBeOneOf([null, expect.any(Number)]), contents: [expect.any(String)] },
        ],
      },
    });

    // student addBidders
    const studentAddBiddersRes = await studentServer.executeOperation({
      query: ADD_QUESTION_BIDDERS,
      variables: { id: newId, userIds: [newBidderId] },
    });
    apolloExpect(studentAddBiddersRes, 'data', {
      addQuestionBidders: {
        ...expectedFormat,
        bidders: [...bidderIds, newBidderId], // student able to see all bidders
      },
    });

    // new Bidder addBidContent
    const newBidderServer = testServer(normalUsers!.find(user => user._id.equals(newBidderId)));
    const newBidderAddBidContentRes = await newBidderServer.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE2, userId: newBidderId },
    });
    apolloExpect(newBidderAddBidContentRes, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidders: [newBidderId], // bidder only see himself
        bids: [
          { bidder: newBidderId, price: expect.toBeOneOf([null, expect.any(Number)]), contents: [expect.any(String)] }, // bidder only see his bidContents
        ],
      },
    });

    // student addBidContent to bidder1 (second bidder)
    const studentAddBidContentToBidder1Res = await studentServer.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE2, userId: bidderIds[1] },
    });
    apolloExpect(studentAddBidContentToBidder1Res, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bids: [
          {
            bidder: bidderIds[1],
            price: expect.toBeOneOf([null, expect.any(Number)]),
            contents: [expect.any(String), expect.any(String)], // total of 2 bidContentIds
          },
          { bidder: bidderIds[0], price: expect.toBeOneOf([null, expect.any(Number)]), contents: [expect.any(String)] },
          { bidder: newBidderId, price: expect.toBeOneOf([null, expect.any(Number)]), contents: [expect.any(String)] },
        ],
      },
    });

    // student addContent
    const studentAddContentRes = await studentServer.executeOperation({
      query: ADD_QUESTION_CONTENT,
      variables: { id: newId, content: FAKE },
    });
    apolloExpect(studentAddContentRes, 'data', {
      addQuestionContent: { ...expectedFormat, contents: [expect.any(String), expect.any(String)] }, // two contentIds: initial & this one
    });

    // student assignTutor (to newBidderId)
    const studentAssignTutorRes = await studentServer.executeOperation({
      query: ASSIGN_QUESTION_TUTOR,
      variables: { id: newId, userId: newBidderId },
    });
    apolloExpect(studentAssignTutorRes, 'data', {
      assignQuestionTutor: { ...expectedFormat, tutor: newBidderId },
    });

    //  tutor (newBidderId) addContent
    const tutorAddContentRes = await newBidderServer.executeOperation({
      query: ADD_QUESTION_CONTENT,
      variables: { id: newId, content: FAKE },
    });
    apolloExpect(tutorAddContentRes, 'data', {
      addQuestionContent: {
        ...expectedFormat,
        tutor: newBidderId,
        contents: [expect.any(String), expect.any(String), expect.any(String)], // 3 contentIds
      },
    });

    // student addContent (add more)
    const studentAddContentRes2 = await studentServer.executeOperation({
      query: ADD_QUESTION_CONTENT,
      variables: { id: newId, content: FAKE },
    });
    apolloExpect(studentAddContentRes2, 'data', {
      addQuestionContent: {
        ...expectedFormat,
        tutor: newBidderId,
        contents: [expect.any(String), expect.any(String), expect.any(String), expect.any(String)], // 4 contentIds
      },
    });

    // bidder1 is no longer able to addBidContent
    const bidder1AddBidContentRes2 = await bidder1Server.executeOperation({
      query: ADD_QUESTION_BID_CONTENT,
      variables: { id: newId, content: FAKE, userId: bidderIds[1] },
    });
    apolloExpect(bidder1AddBidContentRes2, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // bidder1 is only able to see TWO contents
    const bidder1GetOneRes = await bidder1Server.executeOperation({ query: GET_QUESTION, variables: { id: newId } });
    apolloExpect(bidder1GetOneRes, 'data', {
      question: {
        ...expectedFormat,
        tutor: studentId, // override with studentId (tutorId is hidden)
        contents: [expect.any(String), expect.any(String)], // only see TWO contentIds (before tutor is assigned)
      },
    });

    // student update lastViewedAt
    const studentUpdateLastViewedAtRes = await studentServer.executeOperation({
      query: UPDATE_QUESTION_LAST_VIEWED_AT,
      variables: { id: newId },
    });
    apolloExpect(studentUpdateLastViewedAtRes, 'data', {
      updateQuestionLastViewedAt: { ...expectedFormat, members: [expectedMember(studentId, [], true)] },
    });

    // tutor (newBidder) set flag
    const newBidderSetFlagRes = await newBidderServer.executeOperation({
      query: SET_QUESTION_FLAG,
      variables: { id: newId, flag },
    });
    apolloExpect(newBidderSetFlagRes, 'data', {
      setQuestionFlag: {
        ...expectedFormat,
        members: [expectedMember(studentId, [], true), expectedMember(newBidderId, [flag], true)],
      },
    });

    const bidder1UpdateLastViewedAtRes = await bidder1Server.executeOperation({
      query: UPDATE_QUESTION_LAST_VIEWED_AT,
      variables: { id: newId },
    });
    apolloExpect(bidder1UpdateLastViewedAtRes, 'data', {
      updateQuestionLastViewedAt: {
        ...expectedFormat,
        members: [expectedMember(studentId, [], true), expectedMember(bidderIds[1], [], true)], // only able to see student & himself
      },
    });

    // student update lastViewedAt (again)
    const studentUpdateLastViewedAtRes2 = await studentServer.executeOperation({
      query: UPDATE_QUESTION_LAST_VIEWED_AT,
      variables: { id: newId },
    });
    apolloExpect(studentUpdateLastViewedAtRes2, 'data', {
      updateQuestionLastViewedAt: {
        ...expectedFormat,
        members: [
          expectedMember(studentId, [], true),
          expectedMember(newBidderId, [flag], true),
          expectedMember(bidderIds[1], [], true),
        ],
      },
    });

    // tutor (newBidder) clear flag
    const newBidderClearFlagRes = await newBidderServer.executeOperation({
      query: CLEAR_QUESTION_FLAG,
      variables: { id: newId, flag },
    });
    apolloExpect(newBidderClearFlagRes, 'data', {
      clearQuestionFlag: {
        ...expectedFormat,
        members: [expectedMember(studentId, [], true), expectedMember(newBidderId, [], true)],
      },
    });

    // student update ranking
    const ranking = {
      correctness: prob(0.5) ? 1000 : 2000,
      explicitness: prob(0.5) ? 3000 : 3500,
      punctuality: prob(0.5) ? 4000 : 4500,
    };
    const studentRankQuestionRes = await studentServer.executeOperation({
      query: UPDATE_QUESTION_RANKING,
      variables: { id: newId, ...ranking },
    });
    apolloExpect(studentRankQuestionRes, 'data', {
      updateQuestionRanking: { ...expectedFormat, ...ranking },
    });

    // student close question
    const studentCloseQuestionRes = await studentServer.executeOperation({
      query: CLOSE_QUESTION,
      variables: { id: newId },
    });
    apolloExpect(studentCloseQuestionRes, 'data', {
      closeQuestion: { ...expectedFormat, flags: expect.arrayContaining([QUESTION.FLAG.CLOSED]) },
    });

    // student clone
    const userIds = normalUsers!
      .filter(user => !user._id.equals(studentId))
      .slice(10, 13)
      .map(u => u._id.toString())
      .sort();
    const studentCloneQuestionRes = await studentServer.executeOperation({
      query: CLONE_QUESTION,
      variables: { id: newId, userIds },
    });
    apolloExpect(studentCloneQuestionRes, 'data', {
      cloneQuestion: { ...expectedFormat, parent: newId, bidders: userIds },
    });
  });
});
