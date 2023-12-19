/**
 * JEST Test: check /auth-services/*
 *
 * authServiceToken() response with redirect in REST-ful, so we are only testing in apollo mode
 * authServiceUserInfo() only response to REST-ful
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../app';
import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedDateFormat,
  jestSetup,
  jestTeardown,
  randomString,
} from '../jest';
import Tenant from '../models/tenant';
import { AUTH_SERVICE_TOKEN } from '../queries/auth-service';
import { dataDecipher } from '../utils/cipher';

const { TENANT } = LOCALE.DB_ENUM;

// Top level of this test suite:
describe('Auth-Services GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when generates authToken & gets user info', async () => {
    expect.assertions(1 + 3);

    const friendName = 'JEST-apollo';
    const url = 'https://libray.example.com';
    const clientId = randomString();
    const clientSecret = randomString();
    const redirectUri = '/jest';

    // fake an authService
    const authService = [clientId, clientSecret, redirectUri, 'BARE', friendName, url].join('#');
    const { matchedCount } = await Tenant.updateOne(
      { _id: jest.tenantId, services: TENANT.SERVICE.AUTH_SERVICE },
      { $push: { authServices: authService } },
    );
    if (!matchedCount) return; // does not have TENANT.SERVICE.AUTH_SERVICE

    const tokenRes = await apolloTestServer.executeOperation<{ authServiceToken: { token: string } }>(
      { query: AUTH_SERVICE_TOKEN, variables: { client: `${jest.tenantId}#${clientId}` } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(tokenRes, 'data', {
      authServiceToken: { clientId, token: expect.any(String), tokenExpireAt: expectedDateFormat(true), redirectUri },
    });

    // fetch user info using authToken (from a 3rd party service)
    const authToken =
      tokenRes.body.kind === 'single'
        ? await dataDecipher(tokenRes.body.singleResult.data!.authServiceToken.token, clientSecret)
        : null;
    const userInfoRes = await request(app).get(`/api/auth/authServiceUserInfo/${authToken}`);
    expect(userInfoRes.body).toEqual({
      data: expect.objectContaining({
        _id: jest.normalUser._id.toString(),
        name: jest.normalUser.name,
        emails: jest.normalUser.emails,
        schoolHistories: [
          expect.objectContaining({ year: expect.any(String), school: expect.any(String), level: expect.any(String) }),
        ],
      }),
    });
    expect(userInfoRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(userInfoRes.status).toBe(200);
    // clean up
    await Tenant.updateOne({ _id: jest.tenantId }, { $pull: { authServices: authService } });
  });
});
