// TODO: IMPERSONATE_START, IMPERSONATE_STOP, OAUTH2, OAUTH2_CONNECT, OAUTH2_DISCONNECT,

/**
 * Jest: /resolvers/user
 */

import { LOCALE } from '@argonne/common';

import configLoader from '../config/config-loader';
import authController from '../controllers/auth';
import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedDateFormat,
  expectedIdFormat,
  expectedUserFormatApollo as expectedUserFormat,
  genUser,
  jestSetup,
  jestTeardown,
  randomString,
} from '../jest';
import type { TokenDocument } from '../models/token';
import Token from '../models/token';
import User from '../models/user';
import {
  DEREGISTER,
  LIST_TOKENS,
  LOGIN,
  LOGIN_TOKEN,
  LOGIN_WITH_STUDENT_ID,
  LOGIN_WITH_TOKEN,
  LOGOUT,
  LOGOUT_OTHER,
  REGISTER,
  RENEW_TOKEN,
} from '../queries/auth';

type AuthSuccessfulResponse = Awaited<ReturnType<typeof authController.register>>;

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const VALID_EMAIL = 'valid@email.com';
const INVALID_EMAIL = 'invalid_mail'; // yup thinks invalid@email is valid
const INVALID_PASSWORD = 'invalid'; // not meeting PASSWORD_REGEX

const INVALID_PASSWORD_MSG = 'at least 6 characters with one lowercase letter, one uppercase letter and one digit.';

const expectedAuthResponse = {
  accessToken: expect.any(String),
  accessTokenExpireAt: expectedDateFormat(true),
  refreshToken: expect.any(String),
  refreshTokenExpireAt: expectedDateFormat(true),
  user: expect.objectContaining(expectedUserFormat),
};

console.log('auth.test IMPERSONATE_START, IMPERSONATE_STOP, OAUTH2, OAUTH2_CONNECT, OAUTH2_DISCONNECT,');

describe('Authentication GraphQL (token)', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when register, login, 2nd login, logout-other, ..., deregister', async () => {
    expect.assertions(10);
    const { emails, name, password } = genUser(null);
    const [email] = emails;

    // register (1st login)
    const registerRes = await apolloTestServer.executeOperation<{ register: AuthSuccessfulResponse }>(
      { query: REGISTER, variables: { email, name, password } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(registerRes, 'data', { register: expectedAuthResponse });
    // const { refreshToken: refreshTokenReg } = registerRes.data!.register;
    const refreshTokenReg =
      registerRes.body.kind === 'single' ? registerRes.body.singleResult.data!.register.refreshToken : null;

    // login (2nd login)
    const loginRes = await apolloTestServer.executeOperation<{ login: AuthSuccessfulResponse }>(
      { query: LOGIN, variables: { email, password } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(loginRes, 'data', { login: { ...expectedAuthResponse, conflict: null } });
    const refreshToken = loginRes.body.kind === 'single' ? loginRes.body.singleResult.data!.login.refreshToken : null;

    // fail to renew without refreshToken
    const user = await User.findOne({ emails: email }).lean();
    const failRenewRes = await apolloTestServer.executeOperation(
      { query: RENEW_TOKEN },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(
      failRenewRes,
      'errorContaining',
      'Variable "$refreshToken" of required type "String!" was not provided.',
    );

    // renew 2nd login token
    const renewRes = await apolloTestServer.executeOperation<{ renewToken: AuthSuccessfulResponse }>(
      { query: RENEW_TOKEN, variables: { refreshToken } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(renewRes, 'data', { renewToken: expectedAuthResponse });
    const refreshToken2 =
      renewRes.body.kind === 'single' ? renewRes.body.singleResult.data!.renewToken.refreshToken : null;

    // list tokens
    const listTokensRes = await apolloTestServer.executeOperation<{ listTokens: TokenDocument[] }>(
      { query: LIST_TOKENS },
      { contextValue: apolloContext(user) },
    );
    const listTokens = listTokensRes.body.kind === 'single' ? listTokensRes.body.singleResult.data!.listTokens : null;
    expect(listTokens!.length).toBe(2); // register(1st) & login(2nd)
    apolloExpect(listTokensRes, 'data', {
      listTokens: expect.arrayContaining([
        expect.objectContaining({
          _id: expectedIdFormat,
          ip: expect.any(String),
          ua: expect.any(String),
          updatedAt: expectedDateFormat(true),
        }),
      ]),
    });

    // logout other (kick out registered token & 3rd login)
    await apolloTestServer.executeOperation(
      { query: LOGIN, variables: { email, password } },
      { contextValue: apolloContext(null) },
    ); // 3rd login
    const logoutOtherRes = await apolloTestServer.executeOperation(
      { query: LOGOUT_OTHER, variables: { refreshToken: refreshToken2 } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(logoutOtherRes, 'data', { logoutOther: { code: MSG_ENUM.COMPLETED, count: 2 } });

    // should fail to renew (register) after being logged out by 2nd login
    const res = await apolloTestServer.executeOperation(
      { query: RENEW_TOKEN, variables: { refreshToken: refreshTokenReg } },
      { contextValue: apolloContext(user) },
    );

    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.AUTH_RENEW_TOKEN_ERROR}`); // `MSG_CODE#${MSG_ENUM.AUTH_RENEW_TOKEN_ERROR}#${detail-msg}`

    // logout 2nd login
    const logoutRes = await apolloTestServer.executeOperation(
      { query: LOGOUT, variables: { refreshToken: refreshToken2 } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(logoutRes, 'data', { logout: { code: MSG_ENUM.COMPLETED } });

    // delete registration (deregister)
    const deregisterRes = await apolloTestServer.executeOperation(
      { query: DEREGISTER, variables: { password } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(deregisterRes, 'data', { deregister: { code: MSG_ENUM.COMPLETED, days: expect.any(Number) } });
  });

  test('should pass when loginWithStudentId', async () => {
    expect.assertions(1);

    // create a new user (with loginStudentIds)
    const studentId = randomString();
    const user = genUser(jest.tenantId, { studentIds: [`${jest.tenantId}#${studentId}`] });
    const { password } = user; // destructure password before saving. once saved, password is hashed
    await user.save();

    // LoginWithStudentId
    const loginWithStudentIdRes = await apolloTestServer.executeOperation(
      { query: LOGIN_WITH_STUDENT_ID, variables: { studentId, password, tenantId: jest.tenantId } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(loginWithStudentIdRes, 'data', { loginWithStudentId: { ...expectedAuthResponse, conflict: null } });

    // clean-up deregister (remove) test user
    await User.deleteOne({ _id: user._id });
  });

  test('should pass when (school) tenantAdmin creates a loginToken for user to login', async () => {
    expect.assertions(2);

    // create a new user
    const user = genUser(jest.tenantId);
    await user.save();
    const userId = user._id.toString();

    // tenantAdmin generates a loginToken
    const tokenRes = await apolloTestServer.executeOperation<{ loginToken: string }>(
      { query: LOGIN_TOKEN, variables: { tenantId: jest.tenantId, userId } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(tokenRes, 'data', { loginToken: expect.any(String) });
    const token = tokenRes.body.kind === 'single' ? tokenRes.body.singleResult.data!.loginToken : null;

    // login with loginToken (as guest)
    const loginWithTokenRes = await apolloTestServer.executeOperation(
      { query: LOGIN_WITH_TOKEN, variables: { token } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(loginWithTokenRes, 'data', { loginWithToken: { ...expectedAuthResponse, conflict: null } });

    // clean-up deregister (remove) test user
    await User.deleteOne({ _id: user._id });
  });

  test('should fail when login with invalid email & password, without password', async () => {
    expect.assertions(3);

    // invalid email
    let res = await apolloTestServer.executeOperation(
      { query: LOGIN, variables: { email: INVALID_EMAIL, password: User.genValidPassword() } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', 'email must be a valid email');

    // invalid password (too simple)
    res = await apolloTestServer.executeOperation(
      { query: LOGIN, variables: { email: VALID_EMAIL, password: INVALID_PASSWORD } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', INVALID_PASSWORD_MSG);

    // without password
    res = await apolloTestServer.executeOperation({ query: LOGIN, variables: { email: INVALID_EMAIL } });
    apolloExpect(res, 'errorContaining', 'Variable "$password" of required type "String!" was not provided.');
  });

  test('should fail when login with wrong password', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: LOGIN, variables: { email: jest.normalUser.emails[0], password: User.genValidPassword() } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_CREDENTIALS_ERROR}`);
  });

  test('should fail when login with non-existent user', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: LOGIN, variables: { email: `non-exist-${Date.now()}@test.com`, password: User.genValidPassword() } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_CREDENTIALS_ERROR}`);
  });

  test('should fail when login with DELETED user (deletedUser incorrect email format @@)', async () => {
    expect.assertions(1);

    const deletedUser = await User.findOne({ status: USER.STATUS.DELETED });
    if (!deletedUser) throw 'There is NO deleted user in database !!! \n\n';

    const res = await apolloTestServer.executeOperation(
      {
        query: LOGIN,
        variables: { email: deletedUser.emails[0], password: User.genValidPassword() },
      },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', 'email must be a valid email'); // deletedUser has an invalid email
  });

  test('should report conflict when exceeding MAX_LOGIN', async () => {
    expect.assertions(1);

    // create a new user
    const user = genUser(null);
    const [email] = user.emails;
    const { password } = user; // destructure password before saving. Once saved, password is hashed
    await user.save();

    // login many times
    await Promise.all(
      Array(DEFAULTS.AUTH.MAX_LOGIN)
        .fill(0)
        .map(() =>
          apolloTestServer.executeOperation(
            { query: LOGIN, variables: { email, password } },
            { contextValue: apolloContext(null) },
          ),
        ),
    );

    const loginRes = await apolloTestServer.executeOperation(
      { query: LOGIN, variables: { email, password } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(loginRes, 'data', {
      login: {
        conflict: { ip: null, maxLogin: DEFAULTS.AUTH.MAX_LOGIN, exceedLogin: 1 },
        accessToken: null,
        accessTokenExpireAt: null,
        refreshToken: null,
        refreshTokenExpireAt: null,
        user: expect.objectContaining(expectedUserFormat),
      },
    });

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should report conflict when login with different IP', async () => {
    expect.assertions(1);

    // create a new user
    const user = genUser(null);
    const [email] = user.emails;
    const { password } = user; // destructure password before saving. Once saved, password is hashed
    await user.save();

    // login() and then, change token.ip with a random data in token collection
    await apolloTestServer.executeOperation(
      { query: LOGIN, variables: { email, password } },
      { contextValue: apolloContext(null) },
    );
    await Token.findOneAndUpdate({ user: user._id }, { ua: 'Jest-different-IP', ip: 'different-ip' });

    const loginRes = await apolloTestServer.executeOperation(
      { query: LOGIN, variables: { email, password } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(loginRes, 'data', {
      login: {
        conflict: { exceedLogin: null, ip: 'different-ip', maxLogin: null },
        accessToken: null,
        accessTokenExpireAt: null,
        refreshToken: null,
        refreshTokenExpireAt: null,
        user: expect.objectContaining(expectedUserFormat),
      },
    });

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should fail when register a user with invalid password', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: REGISTER, variables: { name: 'valid name', email: VALID_EMAIL, password: INVALID_PASSWORD } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', INVALID_PASSWORD_MSG);
  });

  test('should fail when register a user with (duplicated) registered email', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      {
        query: REGISTER,
        variables: { name: 'whatever', email: jest.normalUser.emails[0], password: User.genValidPassword() },
      },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED}`);
  });

  test('should fail when register a user without providing name, email & password', async () => {
    expect.assertions(3);
    const email = VALID_EMAIL;
    const password = User.genValidPassword();
    const name = 'Valid Name';

    // without email
    let res = await apolloTestServer.executeOperation(
      { query: REGISTER, variables: { password, name } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', 'Variable "$email" of required type "String!" was not provided.');

    // without password
    res = await apolloTestServer.executeOperation(
      { query: REGISTER, variables: { email, name } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', 'Variable "$password" of required type "String!" was not provided.');

    // without name
    res = await apolloTestServer.executeOperation(
      { query: REGISTER, variables: { email, password } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', 'Variable "$name" of required type "String!" was not provided.');
  });
});
