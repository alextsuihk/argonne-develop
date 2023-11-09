/**
 * JEST Test: /api/questions routes
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import {
  type ConvertObjectIdToString,
  expectedDateFormat,
  expectedIdFormat,
  expectedMember,
  FAKE,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  shuffle,
} from '../../jest';
import Classroom from '../../models/classroom';
import type { QuestionDocument } from '../../models/question';
import Question from '../../models/question';
import Subject from '../../models/subject';
import commonTest from './rest-api-test';

type QuestionDocumentEx = Omit<QuestionDocument, 'bids' | 'contentIdx' | 'members'> & {
  members: ConvertObjectIdToString<QuestionDocument['members'][0]>[];
  bids: ConvertObjectIdToString<QuestionDocument['bids'][0]>[];
  contentsToken: string;
};

const { MSG_ENUM } = LOCALE;
const { QUESTION } = LOCALE.DB_ENUM;

const { createUpdateDelete, getMany, getUnauthenticated } = commonTest;

const route = 'questions';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single district format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    tenant: expectedIdFormat,

    student: expectedIdFormat,
    marshals: expect.any(Array),
    members: expect.any(Array),
    deadline: expectedDateFormat(),

    level: expectedIdFormat,
    subject: expectedIdFormat,
    lang: expect.any(String),

    contents: expect.arrayContaining([expectedIdFormat]), // must have at least one content

    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),

    bidders: expect.any(Array),
    bids: expect.any(Array),

    contentsToken: expect.any(String),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById (as student)', async () => {
    const questions = await Question.find({ tenant: jest.tenantId, deletedAt: { $exists: false } }).lean();
    const question = randomItem(questions);

    await getMany(route, { 'Jest-User': question!.student }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should pass when getMany & getById (as bidder)', async () => {
    const questions = await Question.find({
      tenant: jest.tenantId,
      bidders: { $ne: [] },
      deletedAt: { $exists: false },
    }).lean();
    const bidder = randomItem(randomItem(questions)!.bidders);

    await getMany(
      route,
      { 'Jest-User': bidder },
      { ...expectedMinFormat, bidders: expect.arrayContaining([bidder.toString()]) },
      { testGetById: true, testInvalidId: true, testNonExistingId: true },
    );
  });

  test('should pass when getMany & getById (as tutor)', async () => {
    const questions = await Question.find({
      tenant: jest.tenantId,
      tutor: { $exists: true },
      deletedAt: { $exists: false },
    }).lean();
    const { tutor } = randomItem(questions);

    await getMany(
      route,
      { 'Jest-User': tutor! },
      { ...expectedMinFormat, bidders: expect.arrayContaining([tutor!.toString()]) },
      { testGetById: true, testInvalidId: true, testNonExistingId: true },
    );
  });

  test('should fail when GET all (as guest)', async () => getUnauthenticated(route, {}));
  test('should fail when GET one (as guest)', async () => getUnauthenticated(`${route}/${jest.tenantId}`, {})); // for sure, tenantId is not any question's _id

  test('should pass when student creates and removes a question', async () => {
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

    await createUpdateDelete<QuestionDocumentEx>(route, { 'Jest-User': jest.normalUser._id }, [
      {
        action: 'create',
        data: { ...create, tenantId: jest.tenantId, userIds, deadline: addDays(Date.now(), 3), content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormat,
          ...create,
          tenant: jest.tenantId,
          bidders: userIds,
          bids: [],
          members: [expectedMember(jest.normalUser._id.toString(), [])],
          contents: [expect.any(String)],
        },
      },
      { action: 'delete', data: {} },
    ]);
  });

  test('should pass when student creates and auto-assigns to a single tutor, but not allow to remove', async () => {
    const tutorId = jest.normalUsers.at(-1)!._id.toString(); // pick the last user

    const subject = await Subject.findOne({ deletedAt: { $exists: false } }).lean();
    const create = {
      level: randomItem(subject!.levels)._id.toString(),
      subject: subject!._id.toString(),
      lang: randomItem(Object.keys(QUESTION.LANG)),
    };

    await createUpdateDelete<QuestionDocumentEx>(
      route,
      { 'Jest-User': jest.normalUser._id },
      [
        {
          action: 'create',
          data: {
            ...create,
            tenantId: jest.tenantId,
            userIds: [tutorId],
            deadline: addDays(Date.now(), 3),
            content: FAKE,
          },
          expectedMinFormat: {
            ...expectedMinFormat,
            ...create,
            tenant: jest.tenantId,
            tutor: tutorId,
            bidders: [],
            bids: [],
            members: [expectedMember(jest.normalUser._id, [])],
            contents: [expect.any(String)],
          },
        },
        {
          action: 'delete',
          data: {},
          expectedResponse: {
            statusCode: 422,
            data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
          },
        },
      ],
      {
        skipDeleteCheck: true,
      },
    );
  });

  test('should pass the full suite', async () => {
    const flag = QUESTION.MEMBER.FLAG.IMPORTANT;

    const classrooms = await Classroom.find({ tenant: jest.tenantId }).lean();
    const classroom = classrooms
      .sort(shuffle)
      .find(({ students }) => students.find(student => jest.normalUsers.some(u => u._id.equals(student))));
    const studentId = jest.normalUsers.find(user => classroom?.students.some(s => s.equals(user._id)))?._id.toString();
    if (!classroom || !studentId) throw `no valid classroom (${classroom?._id}) or student ${studentId} for testing`;

    const [newBidderId, ...bidderIds] = jest.normalUsers
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

    const ranking = {
      correctness: prob(0.5) ? 1000 : 2000,
      explicitness: prob(0.5) ? 3000 : 3500,
      punctuality: prob(0.5) ? 4000 : 4500,
    };

    const cloningUserIds = jest.normalUsers
      .filter(user => !user._id.equals(studentId))
      .slice(10, 13)
      .map(u => u._id.toString())
      .sort();

    await createUpdateDelete<QuestionDocumentEx>(route, { 'Jest-User': studentId }, [
      {
        action: 'create',
        data: {
          ...create,
          tenantId: jest.tenantId,
          userIds: bidderIds,
          deadline: addDays(Date.now(), 3),
          content: FAKE,
        },
        expectedMinFormat: {
          ...expectedMinFormat,
          ...create,
          tenant: jest.tenantId,
          bidders: bidderIds,
          bids: [],
          members: [expectedMember(studentId, [])],
          contents: [expect.any(String)],
        },
      },
      {
        action: 'addBidContent', // (second) bidder1 addBidContent
        headers: { 'Jest-User': bidderIds[1] },
        data: { content: FAKE, userId: bidderIds[1] },
        expectedMinFormat: {
          ...expectedMinFormat,
          bidders: [bidderIds[1]], // bidder1 only sees himself
          bids: [expect.objectContaining({ bidder: bidderIds[1], contents: [expect.any(String)] })], // bidder1 only sees his bidContents
        },
      },
      {
        action: 'addBidContent', // student addBidContent to bidder0 (first bidder)
        data: { content: FAKE, userId: bidderIds[0] },
        expectedMinFormat: {
          ...expectedMinFormat,
          bidders: bidderIds,
          bids: [
            expect.objectContaining({ bidder: bidderIds[1], contents: [expect.any(String)] }),
            expect.objectContaining({ bidder: bidderIds[0], contents: [expect.any(String)] }),
          ],
        },
      },
      {
        action: 'addBidders',
        data: { userIds: [newBidderId] },
        expectedMinFormat: { ...expectedMinFormat, bidders: [...bidderIds, newBidderId] }, // student able to see all bidders
      },
      {
        action: 'addBidContent', // new Bidder addBidContent
        headers: { 'Jest-User': newBidderId },
        data: { content: FAKE, userId: newBidderId },
        expectedMinFormat: {
          ...expectedMinFormat,
          bidders: [newBidderId], // bidder only sees himself
          bids: [expect.objectContaining({ bidder: newBidderId, contents: [expect.any(String)] })], // bidder only sees his bidContents
        },
      },
      {
        action: 'addBidContent', // student addBidContent to bidder1 (second bidder)
        data: { content: FAKE, userId: bidderIds[1] },
        expectedMinFormat: {
          ...expectedMinFormat,
          bids: [
            expect.objectContaining({ bidder: bidderIds[1], contents: [expect.any(String), expect.any(String)] }), // total of 2 bidContentIds
            expect.objectContaining({ bidder: bidderIds[0], contents: [expect.any(String)] }),
            expect.objectContaining({ bidder: newBidderId, contents: [expect.any(String)] }),
          ],
        },
      },
      {
        action: 'addContent', // student addContent
        data: { content: FAKE },
        expectedMinFormat: { ...expectedMinFormat, contents: [expect.any(String), expect.any(String)] }, // two contentIds: initial & this one
      },
      {
        action: 'assignTutor', // student assignTutor (to newBidderId)
        data: { userId: newBidderId },
        expectedMinFormat: { ...expectedMinFormat, tutor: newBidderId },
      },
      {
        action: 'addContent', // tutor (newBidderId) addContent
        headers: { 'Jest-User': newBidderId },
        data: { content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormat,
          tutor: newBidderId,
          contents: [expect.any(String), expect.any(String), expect.any(String)], // 3 contentIds
        },
      },
      {
        action: 'addContent', // student addContent (add more)
        data: { content: FAKE },
        expectedMinFormat: {
          ...expectedMinFormat,
          contents: [expect.any(String), expect.any(String), expect.any(String), expect.any(String)], // 4 contentIds
        },
      },
      {
        action: 'addBidContent', // bidder1 is no longer able to addBidContent
        headers: { 'Jest-User': bidderIds[1] },
        data: { content: FAKE, userId: bidderIds[1] },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
        },
      },
      {
        action: 'updateLastViewedAt', // student update lastViewedAt
        data: {},
        expectedMinFormat: { ...expectedMinFormat, members: [expectedMember(studentId, [])] },
      },
      {
        action: 'setFlag', // tutor (newBidder) set flag
        headers: { 'Jest-User': newBidderId },
        data: { flag },
        expectedMinFormat: {
          ...expectedMinFormat,
          members: [expectedMember(studentId, []), expectedMember(newBidderId, [flag])],
        },
      },
      {
        action: 'updateLastViewedAt',
        headers: { 'Jest-User': bidderIds[1] },
        data: {},
        expectedMinFormat: {
          ...expectedMinFormat,
          members: [expectedMember(studentId, []), expectedMember(bidderIds[1], [])], // only able to see student & himself
        },
      },
      {
        action: 'updateLastViewedAt', // student update lastViewedAt (again)
        data: {},
        expectedMinFormat: {
          ...expectedMinFormat,
          members: [
            expectedMember(studentId, []),
            expectedMember(newBidderId, [flag]),
            expectedMember(bidderIds[1], []),
          ],
        },
      },
      {
        action: 'clearFlag', // tutor (newBidder) clear flag
        headers: { 'Jest-User': newBidderId },
        data: { flag },
        expectedMinFormat: {
          ...expectedMinFormat,
          members: [expectedMember(studentId, []), expectedMember(newBidderId, [])],
        },
      },
      {
        action: 'updateRanking', // student update ranking
        data: ranking,
        expectedMinFormat: { ...expectedMinFormat, ...ranking },
      },
      {
        action: 'close', // student close question
        data: {},
        expectedMinFormat: { ...expectedMinFormat, flags: expect.arrayContaining([QUESTION.FLAG.CLOSED]) },
      },
      {
        action: 'clone', // student clone
        data: { userIds: cloningUserIds },
        expectedMinFormat: { ...expectedMinFormat, parent: expectedIdFormat, bidders: cloningUserIds },
      },
    ]);
  });
});
