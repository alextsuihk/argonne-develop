/**
 * Jest: /resolvers/analytic
 */

import { LOCALE } from '@argonne/common';

import { apolloContext, apolloExpect, apolloTestServer, FAKE, jestSetup, jestTeardown, prob } from '../jest';
import { ANALYTIC_SESSION } from '../queries/analytic';

const { MSG_ENUM } = LOCALE;

describe('Authentication GraphQL (token)', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when POST session analytic as logged-in users', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: ANALYTIC_SESSION, variables: { fullscreen: prob(0.5), token: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', { analyticSession: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when POST without authentication', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: ANALYTIC_SESSION, variables: { fullscreen: prob(0.5), token: FAKE } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });
});
