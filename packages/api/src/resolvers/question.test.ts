/**
 * Jest: /resolvers/questions
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import {
  apolloExpect,
  apolloContext,
  apolloTestServer,
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
} from '../jest';
import Classroom from '../models/classroom';
import Question, { QuestionDocument } from '../models/question';
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
describe('Question GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

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

    bounty: expect.toBeOneOf([null, expect.any(Number)]),
    bidders: expect.any(Array),
    bids: expect.any(Array),
    paidAt: expect.toBeOneOf([null, expectedDateFormat(true)]),

    correctness: expect.toBeOneOf([null, expect.any(Number)]),
    explicitness: expect.toBeOneOf([null, expect.any(Number)]),
    punctuality: expect.toBeOneOf([null, expect.any(Number)]),

    contentsToken: expect.any(String),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response a single object when GET One by ID (as student, bidder & tutor)', async () => {
    expect.assertions(6);

    const questions = await Question.find({ tenant: jest.tenantId, deletedAt: { $exists: false } }).lean();

    const studentQuestion = randomItem(questions);
    const student = jest.normalUsers.find(u => studentQuestion.student.equals(u._id));

    const bidderQuestion = questions.sort(shuffle).find(q => q.bidders.length);
    const bidder = jest.normalUsers.find(u => bidderQuestion!.bidders!.some(b => b.equals(u._id)));

    const tutorQuestion = questions.sort(shuffle).find(q => q.tutor);
    const tutor = jest.normalUsers.find(u => tutorQuestion?.tutor?.equals(u._id));

    if (!student || !studentQuestion || !bidder || !bidderQuestion || !tutor || !tutorQuestion)
      throw `Insufficient Data for test: ${student?._id}, ${bidder?._id}, ${tutor?._id}`;

    const studentOneRes = await apolloTestServer.executeOperation(
      { query: GET_QUESTION, variables: { id: studentQuestion._id.toString() } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentOneRes, 'data', { question: expectedFormat });
    const studentManyRes = await apolloTestServer.executeOperation(
      { query: GET_QUESTIONS },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentManyRes, 'data', { questions: expect.arrayContaining([expectedFormat]) });

    const bidderOneRes = await apolloTestServer.executeOperation(
      {
        query: GET_QUESTION,
        variables: { id: bidderQuestion._id.toString() },
      },
      { contextValue: apolloContext(bidder) },
    );
    apolloExpect(bidderOneRes, 'data', {
      question: { ...expectedFormat, bidders: expect.arrayContaining([bidder._id.toString()]) },
    });
    const bidderManyRes = await apolloTestServer.executeOperation(
      { query: GET_QUESTIONS },
      { contextValue: apolloContext(bidder) },
    );
    apolloExpect(bidderManyRes, 'data', {
      questions: expect.arrayContaining([
        { ...expectedFormat, bidders: expect.arrayContaining([bidder._id.toString()]) },
      ]),
    });

    const tutorOneRes = await apolloTestServer.executeOperation(
      {
        query: GET_QUESTION,
        variables: { id: tutorQuestion._id.toString() },
      },
      { contextValue: apolloContext(tutor) },
    );
    apolloExpect(tutorOneRes, 'data', { question: { ...expectedFormat, tutor: tutor._id.toString() } });
    const tutorManyRes = await apolloTestServer.executeOperation(
      { query: GET_QUESTIONS },
      { contextValue: apolloContext(tutor) },
    );
    apolloExpect(tutorManyRes, 'data', {
      questions: expect.arrayContaining([{ ...expectedFormat, tutor: tutor._id.toString() }]),
    });
  });

  test('should fail when GET all (as guest)', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: GET_QUESTIONS },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET One by ID (as guest)', async () => {
    expect.assertions(1);

    const chatGroup = await Question.findOne().lean();
    const res = await apolloTestServer.executeOperation(
      { query: GET_QUESTION, variables: { id: chatGroup!._id.toString() } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_QUESTION },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_QUESTION, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should pass when student creates and removes a question', async () => {
    expect.assertions(2);

    const userIds = jest.normalUsers
      .slice(-2)
      .map(u => u._id.toString())
      .sort();

    const subject = await Subject.findOne({ deletedAt: { $exists: false } }).lean();
    const create = {
      level: randomItem(subject!.levels)._id.toString(),
      subject: subject!._id.toString(),
      lang: randomItem(Object.keys(QUESTION.LANG)),
    };
    const createdRes = await apolloTestServer.executeOperation<{ addQuestion: QuestionDocument }>(
      {
        query: ADD_QUESTION,
        variables: { ...create, tenantId: jest.tenantId, userIds, deadline: addDays(Date.now(), 2), content: FAKE },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );

    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        ...create,
        tenant: jest.tenantId,
        parent: null,
        tutor: null,
        bidders: userIds,
        bids: [],
        members: [expectedMember(jest.normalUsers[0]._id, [], true)],
        contents: [expect.any(String)],
      },
    });

    const id = createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addQuestion._id.toString() : null;

    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_QUESTION, variables: { id } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(removedRes, 'data', { removeQuestion: { code: MSG_ENUM.COMPLETED } });
  });

  test('should pass when student creates and auto-assigns to a single tutor, but not allow to remove', async () => {
    expect.assertions(2);

    const tutorId = jest.normalUsers.at(-1)!._id.toString(); // pick the last user

    const subject = await Subject.findOne({ deletedAt: { $exists: false } }).lean();
    const create = {
      level: randomItem(subject!.levels)._id.toString(),
      subject: subject!._id.toString(),
      lang: randomItem(Object.keys(QUESTION.LANG)),
      deadline: addDays(Date.now(), 2),
    };

    // normalUser addQuestion
    const createdRes = await apolloTestServer.executeOperation<{ addQuestion: QuestionDocument }>(
      { query: ADD_QUESTION, variables: { ...create, tenantId: jest.tenantId, userIds: [tutorId], content: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );

    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        ...create,
        tenant: jest.tenantId,
        parent: null,
        tutor: tutorId,
        deadline: create.deadline.getTime(),
        bidders: [],
        bids: [],
        members: [expectedMember(jest.normalUser._id, [], true)],
        contents: [expect.any(String)],
      },
    });

    const id = createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addQuestion._id.toString() : null;

    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_QUESTION, variables: { id } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(removedRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should pass the full suite', async () => {
    expect.assertions(20);

    const flag = QUESTION.MEMBER.FLAG.IMPORTANT;

    const classrooms = await Classroom.find({ tenant: jest.tenantId }).lean();
    const classroom = randomItem(classrooms);

    const student = jest.normalUsers.find(user => classroom?.students.some(s => s.equals(user._id)));
    if (!classroom || !student) throw `no valid classroom (${classroom?._id}) or student ${student?._id} for testing`;

    const [newBidder, ...bidders] = jest.normalUsers
      .filter(user => !user._id.equals(student._id))
      .slice(-3)
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
    const createdRes = await apolloTestServer.executeOperation<{ addQuestion: QuestionDocument }>(
      {
        query: ADD_QUESTION,
        variables: {
          ...create,
          tenantId: jest.tenantId,
          userIds: bidders.map(u => u._id.toString()),
          deadline: addDays(Date.now(), 2),
          content: FAKE,
        },
      },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(createdRes, 'data', {
      addQuestion: {
        ...expectedFormat,
        ...create,
        tenant: jest.tenantId,
        parent: null,
        tutor: null,
        bidders: bidders.map(u => u._id.toString()).sort(),
        bids: [],
        members: [expectedMember(student._id, [], true)],
        contents: [expect.any(String)],
      },
    });

    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addQuestion._id.toString() : null;

    // (second) bidder[1] addBidContent
    const bidder1AddBidContentRes = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_BID_CONTENT, variables: { id: newId, content: FAKE, userId: bidders[1]._id.toString() } },
      { contextValue: apolloContext(bidders[1]) },
    );
    apolloExpect(bidder1AddBidContentRes, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidders: [bidders[1]._id.toString()], // bidder1 only sees himself
        bids: [
          {
            bidder: bidders[1]._id.toString(),
            bounty: expect.toBeOneOf([null, expect.any(Number)]),
            contents: [expect.any(String)],
          },
        ], // bidder1 only sees his bidContents
      },
    });

    // student addBidContent to bidder0 (first bidder)
    const studentAddBidContentToBidder0Res = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_BID_CONTENT, variables: { id: newId, content: FAKE2, userId: bidders[0]._id.toString() } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentAddBidContentToBidder0Res, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidders: bidders.map(u => u._id.toString()).sort(), // student able to see all bidders
        bids: [
          {
            bidder: bidders[1]._id.toString(),
            bounty: expect.toBeOneOf([null, expect.any(Number)]),
            contents: [expect.any(String)],
          },
          {
            bidder: bidders[0]._id.toString(),
            bounty: expect.toBeOneOf([null, expect.any(Number)]),
            contents: [expect.any(String)],
          },
        ],
      },
    });

    // student addBidders
    const studentAddBiddersRes = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_BIDDERS, variables: { id: newId, userIds: [newBidder._id.toString()] } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentAddBiddersRes, 'data', {
      addQuestionBidders: {
        ...expectedFormat,
        bidders: [...bidders.map(u => u._id.toString()).sort(), newBidder._id.toString()], // student able to see all bidders
      },
    });

    // new Bidder addBidContent
    const newBidderAddBidContentRes = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_BID_CONTENT, variables: { id: newId, content: FAKE2, userId: newBidder._id.toString() } },
      { contextValue: apolloContext(newBidder) },
    );
    apolloExpect(newBidderAddBidContentRes, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bidders: [newBidder._id.toString()], // bidder only see himself
        bids: [
          {
            bidder: newBidder._id.toString(),
            bounty: expect.toBeOneOf([null, expect.any(Number)]),
            contents: [expect.any(String)],
          }, // bidder only see his bidContents
        ],
      },
    });

    // student addBidContent to bidder1 (second bidder)
    const studentAddBidContentToBidder1Res = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_BID_CONTENT, variables: { id: newId, content: FAKE2, userId: bidders[1]._id.toString() } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentAddBidContentToBidder1Res, 'data', {
      addQuestionBidContent: {
        ...expectedFormat,
        bids: [
          {
            bidder: bidders[1]._id.toString(),
            bounty: expect.toBeOneOf([null, expect.any(Number)]),
            contents: [expect.any(String), expect.any(String)], // total of 2 bidContentIds
          },
          {
            bidder: bidders[0]._id.toString(),
            bounty: expect.toBeOneOf([null, expect.any(Number)]),
            contents: [expect.any(String)],
          },
          {
            bidder: newBidder._id.toString(),
            bounty: expect.toBeOneOf([null, expect.any(Number)]),
            contents: [expect.any(String)],
          },
        ],
      },
    });

    // student addContent
    const studentAddContentRes = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_CONTENT, variables: { id: newId, content: FAKE } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentAddContentRes, 'data', {
      addQuestionContent: { ...expectedFormat, contents: [expect.any(String), expect.any(String)] }, // two contentIds: initial & this one
    });

    // student assignTutor (to newBidderId)
    const studentAssignTutorRes = await apolloTestServer.executeOperation(
      { query: ASSIGN_QUESTION_TUTOR, variables: { id: newId, userId: newBidder._id.toString() } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentAssignTutorRes, 'data', {
      assignQuestionTutor: { ...expectedFormat, tutor: newBidder._id.toString() },
    });

    //  tutor (newBidderId) addContent
    const tutorAddContentRes = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_CONTENT, variables: { id: newId, content: FAKE } },
      { contextValue: apolloContext(newBidder) },
    );
    apolloExpect(tutorAddContentRes, 'data', {
      addQuestionContent: {
        ...expectedFormat,
        tutor: newBidder._id.toString(),
        contents: [expect.any(String), expect.any(String), expect.any(String)], // 3 contentIds
      },
    });

    // student addContent (add more)
    const studentAddContentRes2 = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_CONTENT, variables: { id: newId, content: FAKE } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentAddContentRes2, 'data', {
      addQuestionContent: {
        ...expectedFormat,
        tutor: newBidder._id.toString(),
        contents: [expect.any(String), expect.any(String), expect.any(String), expect.any(String)], // 4 contentIds
      },
    });

    // bidder1 is no longer able to addBidContent
    const bidder1AddBidContentRes2 = await apolloTestServer.executeOperation(
      { query: ADD_QUESTION_BID_CONTENT, variables: { id: newId, content: FAKE, userId: bidders[1]._id.toString() } },
      { contextValue: apolloContext(bidders[1]) },
    );
    apolloExpect(bidder1AddBidContentRes2, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // bidder1 is only able to see TWO contents
    const bidder1GetOneRes = await apolloTestServer.executeOperation(
      { query: GET_QUESTION, variables: { id: newId } },
      { contextValue: apolloContext(bidders[1]) },
    );
    apolloExpect(bidder1GetOneRes, 'data', {
      question: {
        ...expectedFormat,
        tutor: student._id.toString(), // override with studentId (tutorId is hidden)
        contents: [expect.any(String), expect.any(String)], // only see TWO contentIds (before tutor is assigned)
      },
    });

    // student update lastViewedAt
    const studentUpdateLastViewedAtRes = await apolloTestServer.executeOperation(
      { query: UPDATE_QUESTION_LAST_VIEWED_AT, variables: { id: newId } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentUpdateLastViewedAtRes, 'data', {
      updateQuestionLastViewedAt: { ...expectedFormat, members: [expectedMember(student._id, [], true)] },
    });

    // tutor (newBidder) set flag
    const newBidderSetFlagRes = await apolloTestServer.executeOperation(
      { query: SET_QUESTION_FLAG, variables: { id: newId, flag } },
      { contextValue: apolloContext(newBidder) },
    );
    apolloExpect(newBidderSetFlagRes, 'data', {
      setQuestionFlag: {
        ...expectedFormat,
        members: [expectedMember(student._id, [], true), expectedMember(newBidder._id, [flag], true)],
      },
    });

    // bidder1 update lastViewedAt
    const bidder1UpdateLastViewedAtRes = await apolloTestServer.executeOperation(
      { query: UPDATE_QUESTION_LAST_VIEWED_AT, variables: { id: newId } },
      { contextValue: apolloContext(bidders[1]) },
    );
    apolloExpect(bidder1UpdateLastViewedAtRes, 'data', {
      updateQuestionLastViewedAt: {
        ...expectedFormat,
        members: [expectedMember(student._id, [], true), expectedMember(bidders[1]._id, [], true)], // only able to see student & himself
      },
    });

    // student update lastViewedAt (again)
    const studentUpdateLastViewedAtRes2 = await apolloTestServer.executeOperation(
      { query: UPDATE_QUESTION_LAST_VIEWED_AT, variables: { id: newId } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentUpdateLastViewedAtRes2, 'data', {
      updateQuestionLastViewedAt: {
        ...expectedFormat,
        members: [
          expectedMember(student._id, [], true),
          expectedMember(newBidder._id, [flag], true),
          expectedMember(bidders[1]._id, [], true),
        ],
      },
    });

    // tutor (newBidder) clear flag
    const newBidderClearFlagRes = await apolloTestServer.executeOperation(
      { query: CLEAR_QUESTION_FLAG, variables: { id: newId, flag } },
      { contextValue: apolloContext(newBidder) },
    );
    apolloExpect(newBidderClearFlagRes, 'data', {
      clearQuestionFlag: {
        ...expectedFormat,
        members: [expectedMember(student._id, [], true), expectedMember(newBidder._id, [], true)],
      },
    });

    // student update ranking
    const ranking = {
      correctness: prob(0.5) ? 1000 : 2000,
      explicitness: prob(0.5) ? 3000 : 3500,
      punctuality: prob(0.5) ? 4000 : 4500,
    };
    const studentRankQuestionRes = await apolloTestServer.executeOperation(
      { query: UPDATE_QUESTION_RANKING, variables: { id: newId, ...ranking } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentRankQuestionRes, 'data', {
      updateQuestionRanking: { ...expectedFormat, ...ranking },
    });

    // student close question
    const studentCloseQuestionRes = await apolloTestServer.executeOperation(
      { query: CLOSE_QUESTION, variables: { id: newId } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentCloseQuestionRes, 'data', {
      closeQuestion: { ...expectedFormat, flags: expect.arrayContaining([QUESTION.FLAG.CLOSED]) },
    });

    // student clone
    const userIds = jest.normalUsers
      .filter(user => !user._id.equals(student._id))
      .slice(10, 13)
      .map(u => u._id.toString())
      .sort();
    const studentCloneQuestionRes = await apolloTestServer.executeOperation(
      { query: CLONE_QUESTION, variables: { id: newId, userIds } },
      { contextValue: apolloContext(student) },
    );
    apolloExpect(studentCloneQuestionRes, 'data', {
      cloneQuestion: { ...expectedFormat, parent: newId, bidders: userIds },
    });
  });
});
