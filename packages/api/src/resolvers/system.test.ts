/**
 * Jest: /resolvers/system
 *
 */

import 'jest-extended';

import { apolloExpect, ApolloServer, jestSetup, jestTeardown } from '../jest';
import { GET_SERVER_INFO, GET_SERVER_TIME, PING } from '../queries/system';

// Top system of this test suite:
describe('System GraphQL', () => {
  let guestServer: ApolloServer | null;

  beforeAll(async () => {
    ({ guestServer } = await jestSetup(['guest'], { apollo: true }));
  });
  afterAll(jestTeardown);

  test('should response when GET_SERVER_INFO', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_SERVER_INFO });
    apolloExpect(res, 'data', {
      serverInfo: {
        mode: expect.toBeOneOf(['HUB', 'SATELLITE']),
        primaryTenantId: expect.toBeOneOf([null, expect.any(String)]),
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
    const res = await guestServer!.executeOperation({ query: PING });
    apolloExpect(res, 'data', { ping: 'pong' });
  });

  test('should report system time', async () => {
    expect.assertions(2);
    const res = await guestServer!.executeOperation({ query: GET_SERVER_TIME });
    apolloExpect(res, 'data', { serverTime: expect.any(Number) });
    expect(Math.abs(res.data!.serverTime - Date.now()) < 500).toBeTrue();
  });
});
