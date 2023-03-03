/**
 * Jest: /resolvers/presigned-url
 *
 */

import { LOCALE } from '@argonne/common';

import { apolloExpect, ApolloServer, jestSetup, jestTeardown } from '../jest';
import { ADD_PRESIGNED_URL } from '../queries/presigned-url';

const { MSG_ENUM } = LOCALE;

// Top role of this test suite:
describe('PresignedUrl GraphQL', () => {
  let normalServer: ApolloServer | null;

  beforeAll(async () => {
    ({ normalServer } = await jestSetup(['normal'], { apollo: true }));
  });
  afterAll(jestTeardown);

  test('should pass when creating (requesting) a presignedUrl', async () => {
    expect.assertions(2);

    const res = await normalServer!.executeOperation({
      query: ADD_PRESIGNED_URL,
      variables: { bucketType: 'private', ext: 'PDF' },
    });
    apolloExpect(res, 'data', { addPresignedUrl: { url: expect.any(String), expiry: expect.any(Number) } });

    const res2 = await normalServer!.executeOperation({
      query: ADD_PRESIGNED_URL,
      variables: { bucketType: 'public', ext: 'xlsx' },
    });
    apolloExpect(res2, 'data', { addPresignedUrl: { url: expect.any(String), expiry: expect.any(Number) } });
  });

  test('should fail with invalid bucketType or other invalid inputs', async () => {
    expect.assertions(3);

    // invalid bucketType
    const res1 = await normalServer!.executeOperation({
      query: ADD_PRESIGNED_URL,
      variables: { bucketType: 'invalid', ext: 'docs' },
    });
    apolloExpect(res1, 'error', 'bucketType must be one of the following values: private, public');

    // without bucketType
    const res2 = await normalServer!.executeOperation({ query: ADD_PRESIGNED_URL, variables: { ext: 'jpg' } });
    apolloExpect(res2, 'error', 'Variable "$bucketType" of required type "String!" was not provided.');

    // without ext
    const res3 = await normalServer!.executeOperation({
      query: ADD_PRESIGNED_URL,
      variables: { bucketType: 'public' },
    });
    apolloExpect(res3, 'error', 'Variable "$ext" of required type "String!" was not provided.');
  });
});
