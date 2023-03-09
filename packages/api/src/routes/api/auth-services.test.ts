/**
 * JEST Test: check /api/auth-services/*
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { expectedIdFormat, jestSetup, jestTeardown, uniqueTestUser } from '../../jest';
import Tenant from '../../models/tenant';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('Auth-Services API (token)', () => {
  let accessToken: string;

  const { email, name, password } = uniqueTestUser();

  // create (register) a new user for testing
  beforeAll(async () => {
    await jestSetup([]);
    const res = await request(app).post(`/api/auth/register`).send({ name, email, password });
    ({ accessToken } = res.body.data);
  });

  // delete (deregister) the newly created user
  afterAll(async () => {
    await request(app)
      .delete(`/api/auth/register`)
      .set({ Authorization: `Bearer ${accessToken}` })
      .send({ password });

    await jestTeardown();
  });

  test('should pass when getting user basic info', async () => {
    expect.assertions(3);

    const cascade = await Tenant.findOne({ code: 'CASCADE' });
    const res = await request(app).post(`/api/auth-services`).send({ email, password, apiKey: cascade?.apiKey });

    expect(res.body).toEqual({
      data: {
        user: expect.objectContaining({
          _id: expectedIdFormat,
          tenants: expect.arrayContaining([expect.any(String)]),
          name: expect.any(String),
          password: expect.stringContaining('*'),
          // avatarUrl: expect.any(String), // could be undefined
        }),
      },
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when posting without apiKey or invalid apiKey', async () => {
    expect.assertions(3 * 2);

    // post /auth-service without apiKey
    const res1 = await request(app).post(`/api/auth-services`).send({ email, password });
    expect(res1.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'apiKey' }],
      type: 'yup',
      statusCode: 422,
    });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(422);

    // post /auth-service with invalid apiKey
    const res2 = await request(app).post(`/api/auth-services`).send({ email, password, apiKey: 'WRONG' });
    expect(res2.body).toEqual({ errors: [{ code: MSG_ENUM.TENANT_ERROR }], type: 'plain', statusCode: 400 });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(400);
  });
});
