//! try to make friends cross tenants

/**
 * JEST Test: /api/tenant-binding routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { expectedDateFormat, genUser, jestSetup, jestTeardown, prob, randomString } from '../../jest';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import token, { REFRESH_TOKEN_PREFIX } from '../../utils/token';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;

const { createUpdateDelete } = commonTest;
const route = 'tenant-binding';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUser: UserDocument | null;
  let tenantAdmin: UserDocument | null;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ normalUser, tenantAdmin, tenantId } = await jestSetup(['normal', 'tenantAdmin']));
  });

  afterAll(jestTeardown);

  test('should fail when trying to createToken (as normalUser)', async () =>
    createUpdateDelete(route, { 'Jest-User': normalUser!._id }, [
      {
        action: 'create#createToken',
        data: { tenantId: tenantId!, ...(prob(0.5) && { expiresIn: 11 }) },
        expectedResponse: {
          statusCode: 403,
          data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
        },
      },
    ]));

  test('should fail when trying to createToken (as guest)', async () =>
    createUpdateDelete(route, {}, [
      {
        action: 'create#createToken',
        data: { tenantId: tenantId!, ...(prob(0.5) && { expiresIn: 11 }) },
        expectedResponse: {
          statusCode: 401,
          data: { type: 'plain', statusCode: 401, errors: [{ code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR }] },
        },
      },
    ]));

  test('should fail when creating a tenantToken with invalid parameters', async () =>
    createUpdateDelete(route, { 'Jest-User': tenantAdmin!._id }, [
      {
        action: 'create#createToken',
        data: { expiresIn: 10 },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'yup', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'tenantId' }] },
        },
      },
      {
        action: 'create#createToken',
        data: { tenantId: tenantId!, expiresIn: 'invalid' },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'yup', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'expiresIn' }] },
        },
      },
    ]));

  test('should pass the full suite (createToken, bind, unbind)', async () => {
    expect.assertions(3 * 3 + 2);

    const user = genUser(null); // create a new user (without tenants)
    const [refreshToken] = await Promise.all([
      token.signStrings([REFRESH_TOKEN_PREFIX, user._id.toString(), randomString()], 10),
      user.save(),
    ]);

    // tenantAdmin creates token
    const tokenRes = await request(app)
      .post('/api/tenant-binding/createToken')
      .send({ tenantId: tenantId!, ...(prob(0.5) && { expiresIn: 10 }) })
      .set({ 'Jest-User': tenantAdmin!._id });
    expect(tokenRes.body).toEqual({ data: { token: expect.any(String), expireAt: expectedDateFormat() } });
    expect(tokenRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(tokenRes.status).toBe(200);
    const bindingToken = tokenRes.body.data.token;

    // user binds himself to tenant
    const bindRes = await request(app)
      .post('/api/tenant-binding')
      .send({ bindingToken, refreshToken, ...(prob(0.5) && { studentId: randomString() }) })
      .set({ 'Jest-User': user._id });

    expect(bindRes.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(bindRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(bindRes.status).toBe(200);

    // check if binding is successful
    const updatedUser = await User.findOne({ _id: user._id }).lean();
    expect(updatedUser?.tenants.some(t => t.equals(tenantId!))).toBeTrue();

    // tenantAdmin unbinds user
    const unBindRes = await request(app)
      .delete('/api/tenant-binding')
      .send({ tenantId: tenantId!, userId: user._id })
      .set({ 'Jest-User': tenantAdmin!._id });
    expect(unBindRes.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(unBindRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(unBindRes.status).toBe(200);

    // check if unbinding is successful
    const updated2User = await User.findOne({ _id: user._id }).lean();
    expect(updated2User?.tenants.some(t => t.equals(tenantId!))).toBeFalse();

    // clean up
    await User.deleteOne({ _id: user._id });
  });
});
