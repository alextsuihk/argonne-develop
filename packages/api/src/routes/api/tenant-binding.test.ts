//! try to make friends cross tenants

/**
 * JEST Test: /api/tenant-binding routes
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';
import request from 'supertest';

import app from '../../app';
import { expectedUserFormat, jestSetup, jestTeardown, prob, uniqueTestUser } from '../../jest';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;

const { createUpdateDelete } = commonTest;
const route = 'tenant-binding';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUser: LeanDocument<UserDocument> | null;
  let tenantAdmin: LeanDocument<UserDocument> | null;
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
    expect.assertions(3 * 3);

    // create a new user (without tenants)
    const { email, name, password } = uniqueTestUser();
    const user = await User.create({ tenants: [], name: `tenant-binding-${name}`, emails: [email], password });

    // tenantAdmin creates token
    const tokenRes = await request(app)
      .post('/api/tenant-binding/createToken')
      .send({ tenantId: tenantId!, ...(prob(0.5) && { expiresIn: 10 }) })
      .set({ 'Jest-User': tenantAdmin!._id });
    expect(tokenRes.body).toEqual({ data: { token: expect.any(String), expireAt: expect.any(String) } });
    expect(tokenRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(tokenRes.status).toBe(200);
    const { token } = tokenRes.body.data;

    // user binds himself to tenant
    const bindRes = await request(app).post('/api/tenant-binding').send({ token }).set({ 'Jest-User': user!._id });
    expect(bindRes.body).toEqual({ data: expect.objectContaining({ ...expectedUserFormat, tenants: [tenantId!] }) });
    expect(bindRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(bindRes.status).toBe(200);

    // tenantAdmin unbinds user
    const unBindRes = await request(app)
      .delete('/api/tenant-binding')
      .send({ tenantId: tenantId!, userId: user._id })
      .set({ 'Jest-User': tenantAdmin!._id });
    expect(unBindRes.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(unBindRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(unBindRes.status).toBe(200);

    // clean-up
    await User.deleteOne({ _id: user });
  });
});
