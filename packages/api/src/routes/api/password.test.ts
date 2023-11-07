/**
 * JEST Test: /api/password routes
 *
 */
import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import configLoader from '../../config/config-loader';
import { genUser, jestSetup, jestTeardown, randomString } from '../../jest';
import User from '../../models/user';
import token, { PASSWORD_TOKEN_PREFIX, REFRESH_TOKEN_PREFIX } from '../../utils/token';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

// Top level of this test suite:
describe('Password API Routes', () => {
  let accessToken: string;
  let refreshToken: string;

  const user = genUser(null);
  const { password: oldPassword } = user; // destructure before saving. user.password is hashed once save()

  beforeAll(async () => {
    await jestSetup();
    [refreshToken] = await Promise.all([
      token.signStrings([REFRESH_TOKEN_PREFIX, user._id.toString(), randomString()], DEFAULTS.JWT.EXPIRES.REFRESH),
      user.save(),
    ]);
  });
  afterAll(async () => {
    await User.deleteOne({ _id: user._id });
    await jestTeardown();
  });

  test('should fail when changing newPassword (same as current password)', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post('/api/password/change')
      .set({ 'Jest-User': user._id })
      .send({ currPassword: oldPassword, newPassword: oldPassword, refreshToken });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }], statusCode: 422, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });

  test('should response "completed" when changing password', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post('/api/password/change')
      .set({ 'Jest-User': user._id })
      .send({ currPassword: oldPassword, newPassword: User.genValidPassword(), refreshToken });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should response "completed" when request password reset', async () => {
    expect.assertions(3);

    const res = await request(app).post('/api/password/reset-request').send({ email: user.emails[0] });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when confirm password reset with an invalid token', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post('/api/password/reset-confirm')
      .send({ token: 'invalid', password: User.genValidPassword() });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.TOKEN_ERROR }], statusCode: 400, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(400);
  });

  test('should pass when confirm password reset with an valid token', async () => {
    expect.assertions(3);

    const resetToken = await token.signStrings(
      [PASSWORD_TOKEN_PREFIX, user._id.toString()],
      DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN,
    );

    const res = await request(app)
      .post('/api/password/reset-confirm')
      .send({ token: resetToken, password: User.genValidPassword() });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });
});
