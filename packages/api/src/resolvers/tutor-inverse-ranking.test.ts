/**
 * Jest: /resolvers/tutor-inverse-ranking
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
  expectedIdFormat,
  jestSetup,
  jestTeardown,
  randomItem,
  shuffle,
  testServer,
} from '../jest';
import Question from '../models/question';
import { GET_TUTOR_INVERSE_RANKING, GET_TUTOR_INVERSE_RANKINGS } from '../queries/tutor-inverse-ranking';

const { MSG_ENUM } = LOCALE;

// Top tutor-inverse-ranking of this test suite:
describe('Tutor-Inverse-Ranking GraphQL', () => {
  let tutorServer: ApolloServer;

  const expectedFormat = {
    _id: expectedIdFormat,
    correctness: expect.toBeOneOf([null, expect.any(Number)]),
    explicitness: expect.toBeOneOf([null, expect.any(Number)]),
    punctuality: expect.toBeOneOf([null, expect.any(Number)]),
  };

  beforeAll(async () => {
    const { normalUsers, tenantId } = await jestSetup(['normal'], { apollo: true });

    const questions = await Question.find({
      tenant: tenantId,
      tutor: { $exists: true },
      correctness: { $exists: true },
      explicitness: { $exists: true },
      punctuality: { $exists: true },
    }).lean();
    if (!questions.length) throw 'No questions with proper ranking info to proceed';

    const tutorUserIds = questions.map(q => q.tutor).sort(shuffle);
    const user = normalUsers!.find(u => tutorUserIds.some(tutorUserId => tutorUserId!.equals(u._id)));
    tutorServer = testServer(user!);
  });
  afterAll(jestTeardown);

  test('should response an array of data when GET all, and GET One by studentId', async () => {
    expect.assertions(2);

    const res = await tutorServer.executeOperation({ query: GET_TUTOR_INVERSE_RANKINGS });
    apolloExpect(res, 'data', { tutorInverseRankings: expect.arrayContaining([expectedFormat]) });

    const studentId = randomItem(res.data!.tutorInverseRankings as { _id: string }[])._id.toString();
    const res2 = await tutorServer.executeOperation({ query: GET_TUTOR_INVERSE_RANKING, variables: { id: studentId } });
    apolloExpect(res2, 'data', { tutorInverseRanking: { ...expectedFormat, _id: studentId } });
  });

  test('should fail when GET One without ID argument', async () => {
    expect.assertions(1);

    const res = await tutorServer!.executeOperation({ query: GET_TUTOR_INVERSE_RANKING });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET One without valid Mongo ID argument', async () => {
    expect.assertions(1);

    const res = await tutorServer!.executeOperation({
      query: GET_TUTOR_INVERSE_RANKING,
      variables: { id: 'invalid-mongoID' },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });
});
