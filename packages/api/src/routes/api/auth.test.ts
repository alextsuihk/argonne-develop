console.log('// TODO: auth-impersonate.test.ts: IMPERSONATE_START/STOP, LOGIN_WITH_ID,');
// TODO: auth-oauth2.test.ts

/**
 * JEST Test: check /api/auth/*
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import configLoader from '../../config/config-loader';
import { expectedIdFormat, expectedUserFormat, genUser, jestSetup, jestTeardown, randomString } from '../../jest';
import Token from '../../models/token';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

const VALID_EMAIL = 'valid@email.com';
const INVALID_EMAIL = 'invalid_mail'; // yup thinks invalid@email is valid
const INVALID_PASSWORD = 'invalid'; // not meeting PASSWORD_REGEX

// expect auth (login & register) response
export const expectedAuthResponse = {
  accessToken: expect.any(String),
  accessTokenExpireAt: expect.any(String),
  refreshToken: expect.any(String),
  refreshTokenExpireAt: expect.any(String),
  user: expect.objectContaining(expectedUserFormat),
};

// Top level of this test suite:
describe('Authentication API (token)', () => {
  let normalUser: UserDocument | null;
  let tenantAdmin: UserDocument | null;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ normalUser, tenantAdmin, tenantId } = await jestSetup(['normal', 'tenantAdmin']));
  });
  afterAll(jestTeardown);

  test('should pass when register, login, 2nd login, logout-other, ..., deregister', async () => {
    expect.assertions(3 * 9);
    const { emails, name, password } = genUser(null);
    const [email] = emails;

    // register (1st login)
    const registerRes = await request(app).post(`/api/auth/register`).send({ email, name, password });
    expect(registerRes.body).toEqual({ data: expectedAuthResponse });
    expect(registerRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(registerRes.status).toBe(201);
    const { refreshToken: refreshTokenReg } = registerRes.body.data;

    // login (2nd login)
    const loginRes = await request(app).post(`/api/auth/login`).send({ email, password });
    expect(loginRes.body).toEqual({ data: expectedAuthResponse });
    expect(loginRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(loginRes.status).toBe(200);
    const { refreshToken } = loginRes.body.data;

    // fail to renew without refreshToken
    const failRenewRes = await request(app).post(`/api/auth/renewToken`);
    expect(failRenewRes.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'refreshToken' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(failRenewRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(failRenewRes.status).toBe(422);

    // renew 2nd login token
    const renewRes = await request(app).post(`/api/auth/renewToken`).send({ refreshToken });
    expect(renewRes.body).toEqual({ data: expectedAuthResponse });
    expect(renewRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(renewRes.status).toBe(200);
    const { accessToken: accessToken2, refreshToken: refreshToken2 } = renewRes.body.data;

    // list tokens
    const listTokensRes = await request(app)
      .get(`/api/auth/listTokens`)
      .set({ Authorization: `Bearer ${accessToken2}` });
    expect(listTokensRes.body).toEqual({
      data: expect.arrayContaining([
        expect.objectContaining({
          _id: expectedIdFormat,
          ip: expect.any(String),
          ua: expect.any(String),
          updatedAt: expect.any(String),
        }),
      ]),
    });
    expect(listTokensRes.body.data.length).toBe(2); // register(1st) & login(2nd)
    expect(listTokensRes.status).toBe(200);

    // logout other (kick out registered token & 3rd login)
    await request(app).post(`/api/auth/login`).send({ email, password }); // 3rd login
    // await new Promise(resolve => setTimeout(resolve, 100));
    const logoutOtherRes = await request(app)
      .post(`/api/auth/logoutOthers`)
      .set({ Authorization: `Bearer ${accessToken2}` })
      .send({ refreshToken: refreshToken2 });
    expect(logoutOtherRes.body).toEqual({ code: MSG_ENUM.COMPLETED, count: 2 }); // logout 2nd & 3rd
    expect(logoutOtherRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(logoutOtherRes.status).toBe(200);

    // should fail to renew (register) after being logged out by 2nd login
    const res = await request(app).post(`/api/auth/renewToken`).send({ refreshToken: refreshTokenReg });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.AUTH_RENEW_TOKEN_ERROR }], statusCode: 400, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(400);

    // logout 2nd login
    const logoutRes = await request(app)
      .post(`/api/auth/logout`)
      .set({ Authorization: `Bearer ${accessToken2}` })
      .send({ refreshToken: refreshToken2 });
    expect(logoutRes.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(logoutRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(logoutRes.status).toBe(200);

    // delete registration (deregister)
    const resLoginRes = await request(app).post(`/api/auth/login`).send({ email, password });
    const deregisterRes = await request(app)
      .post(`/api/auth/deregister`)
      .set({ Authorization: `Bearer ${resLoginRes.body.data.accessToken}` })
      .send({ password });
    expect(deregisterRes.body).toEqual({ code: MSG_ENUM.COMPLETED, days: expect.any(Number) });
    expect(deregisterRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(deregisterRes.status).toBe(200);
  });

  test('should pass when loginWithStudentId', async () => {
    expect.assertions(3 * 1);

    // create a new user (with loginStudentIds)
    const studentId = randomString();
    const user = genUser(tenantId!, { studentIds: [`${tenantId!}#${studentId}`] });
    const { password } = user; // destructure password before saving. once saved, password is hashed
    await user.save();

    // loginWithStudentId
    const loginWithStudentIdRes = await request(app)
      .post(`/api/auth/loginWithStudentId`)
      .send({ studentId, password, tenantId });
    expect(loginWithStudentIdRes.body).toEqual({ data: expectedAuthResponse });
    expect(loginWithStudentIdRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(loginWithStudentIdRes.status).toBe(200);

    // clean-up deregister (remove) test user
    await User.deleteOne({ _id: user });
  });

  test('should pass when (school) tenantAdmin creates a loginToken for user to login', async () => {
    expect.assertions(3 * 2);

    // create a new user
    const user = genUser(tenantId!);
    await user.save();

    // tenantAdmin generates a loginToken
    const res = await request(app)
      .get(`/api/auth/loginToken`)
      .set({ 'Jest-User': tenantAdmin!._id })
      .send({ tenantId: tenantId!, userId: user._id });
    expect(res.body).toEqual({ data: expect.any(String) });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);

    // new user login with loginToken
    const res2 = await request(app).post(`/api/auth/loginWithToken`).send({ token: res.body.data });
    expect(res2.body).toEqual({ data: expectedAuthResponse });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(200);

    // clean-up deregister (remove) test user
    await User.deleteOne({ _id: user });
  });

  test('should fail when login with invalid email & password, without password', async () => {
    expect.assertions(3 + 3 + 3);

    // invalid email
    let res = await request(app)
      .post(`/api/auth/login`)
      .send({ email: INVALID_EMAIL, password: User.genValidPassword() });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'email' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);

    // invalid password (too simple)
    res = await request(app).post(`/api/auth/login`).send({ email: VALID_EMAIL, password: INVALID_PASSWORD });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'password' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);

    // without password
    res = await request(app).post(`/api/auth/login`).send({ email: VALID_EMAIL });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'password' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });

  test('should fail when login with wrong password', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post(`/api/auth/login`)
      .send({ email: normalUser!.emails[0], password: User.genValidPassword() });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.AUTH_CREDENTIALS_ERROR }], statusCode: 401, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(401);
  });

  test('should fail when login with non-existent user', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post(`/api/auth/login`)

      .send({ email: `non-exist-${Date.now()}@test.com`, password: User.genValidPassword() });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.AUTH_CREDENTIALS_ERROR }], statusCode: 401, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(401);
  });

  test('should fail when login with DELETED user (because of incorrect email format @@)', async () => {
    expect.assertions(3);

    const deletedUser = await User.findOne({ status: 'DELETED' });
    if (!deletedUser) throw 'There is NO deleted user in database !!! \n\n';

    const res = await request(app)
      .post(`/api/auth/login`)

      .send({ email: deletedUser.emails[0], password: User.genValidPassword() });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'email' }],
      statusCode: 422,
      type: 'yup',
    }); // deletedUser has an invalid email
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });

  test('should report conflict when exceeding MAX_LOGIN', async () => {
    expect.assertions(3);

    // register a new user
    const { emails, name, password } = genUser(null);
    const [email] = emails;
    const registerRes = await request(app).post(`/api/auth/register`).send({ name, email, password });
    const { accessToken } = registerRes.body.data;

    // valid & successful logins
    await Promise.all(
      Array(DEFAULTS.AUTH.MAX_LOGIN - 1)
        .fill(0)
        .map(() => request(app).post(`/api/auth/login`).send({ email, password })),
    );

    const res = await request(app).post(`/api/auth/login`).send({ email, password });
    expect(res.body).toEqual({
      data: {
        user: expect.objectContaining(expectedUserFormat),
        conflict: { maxLogin: DEFAULTS.AUTH.MAX_LOGIN, exceedLogin: 1 },
      },
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);

    // clean-up deregister (remove) test user
    await request(app)
      .post(`/api/auth/deregister`)
      .set({ Authorization: `Bearer ${accessToken}` })
      .send({ password });
  });

  test('should report conflict when login with different IP', async () => {
    expect.assertions(3);

    // register a new user
    const { emails, name, password } = genUser(null);
    const [email] = emails;
    const registerRes = await request(app).post(`/api/auth/register`).send({ name, email, password });
    const { accessToken, refreshToken } = registerRes.body.data;

    // change token.ip with a random data in token collection
    await Token.findOneAndUpdate({ token: refreshToken }, { ua: 'Jest-different-IP', ip: 'different-ip' });

    const res = await request(app).post(`/api/auth/login`).send({ email, password });
    expect(res.body).toEqual({
      data: { user: expect.objectContaining(expectedUserFormat), conflict: { ip: 'different-ip' } },
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);

    // clean-up deregister (remove) test user
    await request(app)
      .post(`/api/auth/deregister`)
      .set({ Authorization: `Bearer ${accessToken}` })
      .send({ password });
  });

  test('should fail when register a user with invalid password', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post(`/api/auth/register`)

      .send({ name: 'valid name', email: VALID_EMAIL, password: INVALID_PASSWORD });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'password' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });

  test('should fail when register a user with (duplicated) registered email', async () => {
    expect.assertions(3);

    const res = await request(app).post(`/api/auth/register`).send({
      name: 'whatever',
      email: normalUser!.emails[0],
      password: User.genValidPassword(),
    });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED }],
      statusCode: 400,
      type: 'plain',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(400);
  });

  test('should fail when register a user without providing name, email & password', async () => {
    expect.assertions(9);

    const email = VALID_EMAIL;
    const password = User.genValidPassword();
    const name = 'Valid Name';

    // without email
    let res = await request(app).post(`/api/auth/register`).send({ password, name });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'email' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);

    // without password
    res = await request(app).post(`/api/auth/register`).send({ email, name });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'password' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);

    // without name
    res = await request(app).post(`/api/auth/register`).send({ email, password });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'name' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });
});
