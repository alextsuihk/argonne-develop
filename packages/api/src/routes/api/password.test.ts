/**
 * JEST Test: /api/password routes
 *
 */
import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import configLoader from '../../config/config-loader';
import { PASSWORD_TOKEN_PREFIX } from '../../controllers/password';
import { jestSetup, jestTeardown, uniqueTestUser } from '../../jest';
import User from '../../models/user';
import token from '../../utils/token';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

// Top level of this test suite:
describe('Password API Routes', () => {
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  const { email, name, password: oldPassword } = uniqueTestUser();
  const newPassword = User.genValidPassword();

  // create (register) a new user for testing
  beforeAll(async () => {
    await jestSetup([]);

    const res = await request(app).post(`/api/auth/register`).send({ name, email, password: oldPassword });
    ({ accessToken, refreshToken } = res.body.data);
    userId = res.body.data.user._id;
  });

  // delete (deregister) the newly created user
  afterAll(async () => {
    await request(app)
      .delete(`/api/auth/register`)
      .set({ Authorization: `Bearer ${accessToken}` })
      .send({ password: newPassword });

    await jestTeardown();
  });

  test('should fail when changing newPassword (same as current password)', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post('/api/password/change')
      .set({ Authorization: `Bearer ${accessToken}` })
      .send({ currPassword: oldPassword, newPassword: oldPassword, refreshToken });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }], statusCode: 422, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });

  test('should response "completed" when changing password', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post('/api/password/change')
      .set({ Authorization: `Bearer ${accessToken}` })
      .send({ currPassword: oldPassword, newPassword: newPassword, refreshToken });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should response "completed" when request password reset', async () => {
    expect.assertions(3);

    const res = await request(app).post('/api/password/reset-request').send({ email });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when confirm password reset with an invalid token', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post('/api/password/reset-confirm')
      .send({ token: 'invalid', password: newPassword });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.TOKEN_ERROR }], statusCode: 400, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(400);
  });

  test('should pass when confirm password reset with an valid token', async () => {
    expect.assertions(3);

    const resetToken = await token.signStrings(
      [PASSWORD_TOKEN_PREFIX, userId],
      DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN,
    );

    const res = await request(app)
      .post('/api/password/reset-confirm')
      .send({ token: resetToken, password: newPassword });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });
});
