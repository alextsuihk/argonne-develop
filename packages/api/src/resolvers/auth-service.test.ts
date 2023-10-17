/**
 * JEST Test: check /auth-services/*
 *
 * authServiceToken() response with redirect in REST-ful, so we are only testing in apollo mode
 * authServiceUserInfo() only response to REST-ful
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../app';
import { apolloExpect, ApolloServer, expectedDateFormat, jestSetup, jestTeardown, randomString } from '../jest';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import { AUTH_SERVICE_TOKEN } from '../queries/auth-service';
import { dataDecipher } from '../utils/cipher';

const { TENANT } = LOCALE.DB_ENUM;

// Top level of this test suite:
describe('Auth-Services GraphQL', () => {
  let normalServer: ApolloServer | null;
  let normalUser: UserDocument | null;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ normalServer, normalUser, tenantId } = await jestSetup(['normal'], { apollo: true }));
  });

  afterAll(jestTeardown);

  test('should pass when generates authToken & gets user info', async () => {
    expect.assertions(1 + 3);

    const clientId = randomString();
    const clientSecret = randomString();
    const redirectUri = '/jest';
    const friendKey = 'JEST-apollo';

    // fake an authService
    const authService = [clientId, clientSecret, redirectUri, 'BARE', friendKey].join('#');
    const { matchedCount } = await Tenant.updateOne(
      { _id: tenantId!, services: TENANT.SERVICE.AUTH_SERVICE },
      { $push: { authServices: authService } },
    );
    if (!matchedCount) return; // does not have TENANT.SERVICE.AUTH_SERVICE

    const tokenRes = await normalServer!.executeOperation({
      query: AUTH_SERVICE_TOKEN,
      variables: { client: `${tenantId!}#${clientId}` },
    });
    apolloExpect(tokenRes, 'data', {
      authServiceToken: { clientId, token: expect.any(String), tokenExpireAt: expectedDateFormat(true), redirectUri },
    });

    const authToken = await dataDecipher(tokenRes.data!.authServiceToken.token, clientSecret); // emulating 3rd party app to decipher data

    const expectedFormat = expect.objectContaining({
      _id: normalUser!._id.toString(),
      name: normalUser!.name,
      emails: normalUser!.emails,
      schoolHistories: [
        expect.objectContaining({ year: expect.any(String), school: expect.any(String), level: expect.any(String) }),
      ],
    });

    // fetch user info using authToken (from a 3rd party service)
    const userInfoRes = await request(app).get(`/api/auth/authServiceUserInfo/${authToken}`);
    expect(userInfoRes.body).toEqual({ data: expectedFormat });
    expect(userInfoRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(userInfoRes.status).toBe(200);
    // clean up
    await Tenant.updateOne({ _id: tenantId! }, { $pull: { authServices: authService } });
  });
});
