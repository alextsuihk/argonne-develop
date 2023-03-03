/**
 * Jest: /resolvers/tutor-ranking
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
  expectedIdFormat,
  idsToString,
  jestSetup,
  jestTeardown,
  shuffle,
  testServer,
} from '../jest';
import Tutor from '../models/tutor';
import { GET_TUTOR_RANKING, GET_TUTOR_RANKINGS } from '../queries/tutor-ranking';

const { MSG_ENUM } = LOCALE;

// Top tutor-ranking of this test suite:
describe('Tutor-Ranking GraphQL', () => {
  let tutorServer: ApolloServer;

  const expectedFormat = {
    _id: expectedIdFormat,
    correctness: expect.any(Number),
    explicitness: expect.any(Number),
    punctuality: expect.any(Number),
  };

  beforeAll(async () => {
    const { normalUsers, tenantId } = await jestSetup(['normal'], { apollo: true });

    const tutors = await Tutor.find({ tenant: tenantId }).lean();
    const tutorUserIds = tutors.map(t => t.user.toString());

    const user = normalUsers!.find(u => tutorUserIds.includes(u._id.toString()));
    tutorServer = testServer(user!);
  });
  afterAll(jestTeardown);

  test('should response an array of data when GET all, and GET One by studentId', async () => {
    expect.assertions(2);

    const res = await tutorServer.executeOperation({ query: GET_TUTOR_RANKINGS });
    apolloExpect(res, 'data', { tutorRankings: expect.arrayContaining([expectedFormat]) });

    const [studentId] = idsToString(res.data!.tutorRankings).sort(shuffle);
    const res2 = await tutorServer.executeOperation({ query: GET_TUTOR_RANKING, variables: { id: studentId } });
    apolloExpect(res2, 'data', { tutorRanking: { ...expectedFormat, _id: studentId } });
  });

  test('should fail when GET One without ID argument', async () => {
    expect.assertions(1);

    const res = await tutorServer!.executeOperation({ query: GET_TUTOR_RANKING });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET One without valid Mongo ID argument', async () => {
    expect.assertions(1);

    const res = await tutorServer!.executeOperation({ query: GET_TUTOR_RANKING, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });
});
