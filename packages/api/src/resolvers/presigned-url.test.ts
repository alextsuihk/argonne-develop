/**
 * Jest: /resolvers/presigned-url
 *
 */

import { LOCALE } from '@argonne/common';

import { apolloContext, apolloExpect, apolloTestServer, jestSetup, jestTeardown } from '../jest';
import { ADD_PRESIGNED_URL } from '../queries/presigned-url';

const { MSG_ENUM } = LOCALE;

// Top role of this test suite:
describe('PresignedUrl GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when creating (requesting) a presignedUrl', async () => {
    expect.assertions(2);

    const res = await apolloTestServer.executeOperation(
      { query: ADD_PRESIGNED_URL, variables: { bucketType: 'private', ext: 'PDF' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', { addPresignedUrl: { url: expect.any(String), expiry: expect.any(Number) } });

    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_PRESIGNED_URL, variables: { bucketType: 'public', ext: 'xlsx' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'data', { addPresignedUrl: { url: expect.any(String), expiry: expect.any(Number) } });
  });

  test('should fail with invalid bucketType or other invalid inputs', async () => {
    expect.assertions(3);

    // invalid bucketType
    const res1 = await apolloTestServer.executeOperation(
      { query: ADD_PRESIGNED_URL, variables: { bucketType: 'invalid', ext: 'docs' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res1, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // without bucketType
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_PRESIGNED_URL, variables: { ext: 'jpg' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', 'Variable "$bucketType" of required type "String!" was not provided.');

    // without ext
    const res3 = await apolloTestServer.executeOperation(
      { query: ADD_PRESIGNED_URL, variables: { bucketType: 'public' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res3, 'error', 'Variable "$ext" of required type "String!" was not provided.');
  });
});
