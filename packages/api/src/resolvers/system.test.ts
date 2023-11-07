/**
 * Jest: /resolvers/system
 *
 */

import 'jest-extended';

import { apolloContext, apolloExpect, apolloTestServer, jestSetup, jestTeardown } from '../jest';
import { GET_SERVER_INFO, GET_SERVER_TIME, PING } from '../queries/system';

// Top system of this test suite:
describe('System GraphQL', () => {
  beforeAll(jestSetup);
  afterAll(jestTeardown);

  test('should response when GET_SERVER_INFO', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_SERVER_INFO },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', {
      serverInfo: {
        mode: expect.toBeOneOf(['HUB', 'SATELLITE']),
        primaryTenantId: expect.toBeOneOf([null, expect.any(String)]),
        status: expect.any(String), // logically, should never be null (but could be programmatically)
        minio: expect.any(String),
        timestamp: expect.any(Number),
        version: expect.any(String),
        hubVersion: expect.toBeOneOf([null, expect.any(String)]),
        hash: expect.any(String),
        builtAt: expect.any(String),
      },
    });
  });

  test('should response when PING', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation({ query: PING }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'data', { ping: 'pong' });
  });

  test('should report system time', async () => {
    expect.assertions(2);
    const res = await apolloTestServer.executeOperation<{ serverTime: number }>(
      { query: GET_SERVER_TIME },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { serverTime: expect.any(Number) });
    expect(res.body.kind === 'single' && Date.now() - res.body.singleResult.data!.serverTime < 500).toBeTrue();
  });
});
