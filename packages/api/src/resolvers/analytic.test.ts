/**
 * Jest: /resolvers/analytic
 */

import { LOCALE } from '@argonne/common';

import { apolloExpect, ApolloServer, FAKE, jestSetup, jestTeardown, prob } from '../jest';
import { ANALYTIC_SESSION } from '../queries/analytic';

const { MSG_ENUM } = LOCALE;

describe('Authentication GraphQL (token)', () => {
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;

  beforeAll(async () => {
    ({ guestServer, normalServer } = await jestSetup(['admin', 'guest', 'normal'], { apollo: true }));
  });
  afterAll(jestTeardown);

  test('should pass when POST session analytic as logged-in users', async () => {
    expect.assertions(1);

    const res = await normalServer!.executeOperation({
      query: ANALYTIC_SESSION,
      variables: { fullscreen: prob(0.5), token: FAKE },
    });
    apolloExpect(res, 'data', { analyticSession: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when POST without authentication', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: ANALYTIC_SESSION,
      variables: { fullscreen: prob(0.5), token: FAKE },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });
});
