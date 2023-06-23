/**
 * JEST Test: check /api/auth-services/*
 *
 */

import { createDecipheriv, scrypt } from 'node:crypto';

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../app';
import { ALGORITHM } from '../controllers/auth-service';
import { apolloExpect, ApolloServer, jestSetup, jestTeardown, randomString } from '../jest';
import Tenant from '../models/tenant';
import type { Id, UserDocument } from '../models/user';
import { GET_AUTHORIZATION_TOKEN } from '../queries/auth-service';

const { TENANT } = LOCALE.DB_ENUM;

// Top level of this test suite:
describe('Auth-Services GraphQL', () => {
  let normalServer: ApolloServer | null;
  let normalUser: (UserDocument & Id) | null;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ normalServer, normalUser, tenantId } = await jestSetup(['normal'], { apollo: true }));
  });

  afterAll(jestTeardown);

  test('should pass when generates authToken & gets user info', async () => {
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

    expect.assertions(1 + 3);

    const tokenRes = await normalServer!.executeOperation({
      query: GET_AUTHORIZATION_TOKEN,
      variables: { client: `${tenantId!}#${clientId}` },
    });
    apolloExpect(tokenRes, 'data', {
      authorizationToken: { clientId, token: expect.any(String), tokenExpireAt: expect.any(Number), redirectUri },
    });

    // decipher token
    const [iv, encrypted] = tokenRes.data!.authorizationToken.token.split('#');
    const key = await new Promise<Buffer>(resolve => scrypt(clientSecret, 'salt', 24, (_, key) => resolve(key)));
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
    const authToken = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');

    const expectedFormat = expect.objectContaining({
      _id: normalUser!._id.toString(),
      name: normalUser!.name,
      emails: normalUser!.emails,
      schoolHistories: [
        expect.objectContaining({ year: expect.any(String), school: expect.any(String), level: expect.any(String) }),
      ],
    });

    // fetch user info using authToken
    const userInfoRes = await request(app).post(`/api/auth-services`).send({ token: authToken });
    expect(userInfoRes.body).toEqual({ data: expectedFormat });
    expect(userInfoRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(userInfoRes.status).toBe(200);
    // clean up
    await Tenant.updateOne({ _id: tenantId! }, { $pull: { authServices: authService } });
  });
});
