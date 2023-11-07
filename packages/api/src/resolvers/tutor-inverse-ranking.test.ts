/**
 * Jest: /resolvers/tutor-inverse-ranking
 *
 */

import { LOCALE } from '@argonne/common';

import tutorInverseRankingController from '../controllers/tutor-inverse-ranking';
import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedIdFormat,
  jestSetup,
  jestTeardown,
  randomItem,
  shuffle,
} from '../jest';
import Question from '../models/question';
import type { UserDocument } from '../models/user';
import { GET_TUTOR_INVERSE_RANKING, GET_TUTOR_INVERSE_RANKINGS } from '../queries/tutor-inverse-ranking';

const { MSG_ENUM } = LOCALE;

// Top tutor-inverse-ranking of this test suite:
describe('Tutor-Inverse-Ranking GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;
  let tutorUser: UserDocument;

  const expectedFormat = {
    _id: expectedIdFormat,
    correctness: expect.toBeOneOf([null, expect.any(Number)]),
    explicitness: expect.toBeOneOf([null, expect.any(Number)]),
    punctuality: expect.toBeOneOf([null, expect.any(Number)]),
  };

  beforeAll(async () => {
    jest = await jestSetup();

    const questions = await Question.find({
      tenant: jest.tenantId,
      tutor: { $exists: true },
      correctness: { $exists: true },
      explicitness: { $exists: true },
      punctuality: { $exists: true },
    }).lean();
    if (!questions.length) throw 'No questions with proper ranking info to proceed';

    const tutorUserIds = questions.map(q => q.tutor).sort(shuffle);
    tutorUser = jest.normalUsers.find(u => tutorUserIds.some(tutorUserId => tutorUserId!.equals(u._id)))!;
  });
  afterAll(jestTeardown);

  test('should response an array of data when GET all, and GET One by studentId', async () => {
    expect.assertions(2);

    const res = await apolloTestServer.executeOperation<{
      tutorInverseRankings: Awaited<ReturnType<typeof tutorInverseRankingController.find>>;
    }>({ query: GET_TUTOR_INVERSE_RANKINGS }, { contextValue: apolloContext(tutorUser) });
    apolloExpect(res, 'data', { tutorInverseRankings: expect.arrayContaining([expectedFormat]) });

    const studentId =
      res.body.kind === 'single' ? randomItem(res.body.singleResult.data!.tutorInverseRankings)._id.toString() : null;
    const res2 = await apolloTestServer.executeOperation(
      { query: GET_TUTOR_INVERSE_RANKING, variables: { id: studentId } },
      { contextValue: apolloContext(tutorUser) },
    );
    apolloExpect(res2, 'data', { tutorInverseRanking: { ...expectedFormat, _id: studentId } });
  });

  test('should fail when GET One without ID argument', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: GET_TUTOR_INVERSE_RANKING },
      { contextValue: apolloContext(tutorUser) },
    );
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET One without valid Mongo ID argument', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: GET_TUTOR_INVERSE_RANKING, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(tutorUser) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });
});
