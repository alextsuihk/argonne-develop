// TODO: IMPERSONATE_START, IMPERSONATE_STOP, OAUTH2, OAUTH2_CONNECT, OAUTH2_DISCONNECT,

/**
 * Jest: /resolvers/user
 */

import { LOCALE } from '@argonne/common';

import configLoader from '../config/config-loader';
import {
  apolloExpect,
  ApolloServer,
  expectedDateFormat,
  expectedIdFormat,
  expectedUserFormatApollo as expectedUserFormat,
  genUser,
  jestSetup,
  jestTeardown,
  randomString,
  testServer,
} from '../jest';
import Token from '../models/token';
import type { Id, UserDocument } from '../models/user';
import User from '../models/user';
import {
  DEREGISTER,
  // OAUTH2,
  IMPERSONATE_START,
  IMPERSONATE_STOP,
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
  let guestServer: ApolloServer | null;
  let tenantAdminServer: ApolloServer | null;
  let normalUser: (UserDocument & Id) | null;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ guestServer, normalUser, tenantAdminServer, tenantId } = await jestSetup(['guest', 'normal', 'tenantAdmin'], {
      apollo: true,
    }));
  });
  afterAll(jestTeardown);

  test('should pass when register, login, 2nd login, logout-other, ..., deregister', async () => {
    expect.assertions(10);
    const { emails, name, password } = genUser(null);
    const [email] = emails;

    // register (1st login)
    const registerRes = await guestServer!.executeOperation({ query: REGISTER, variables: { email, name, password } });
    apolloExpect(registerRes, 'data', { register: expectedAuthResponse });
    const { refreshToken: refreshTokenReg } = registerRes.data!.register;

    // login (2nd login)
    const loginRes = await guestServer!.executeOperation({ query: LOGIN, variables: { email, password } });
    apolloExpect(loginRes, 'data', { login: { ...expectedAuthResponse, conflict: null } });
    const { refreshToken } = loginRes.data!.login;

    // fail to renew without refreshToken
    const user = await User.findOneActive({ _id: registerRes.data!.register.user });
    const userServer = testServer(user);
    const failRenewRes = await userServer.executeOperation({ query: RENEW_TOKEN });
    apolloExpect(
      failRenewRes,
      'errorContaining',
      'Variable "$refreshToken" of required type "String!" was not provided.',
    );

    // renew 2nd login token
    const renewRes = await userServer.executeOperation({ query: RENEW_TOKEN, variables: { refreshToken } });
    apolloExpect(renewRes, 'data', { renewToken: expectedAuthResponse });
    const { refreshToken: refreshToken2 } = renewRes.data!.renewToken;

    // list tokens
    const listTokensRes = await userServer.executeOperation({ query: LIST_TOKENS });
    expect(listTokensRes.data!.listTokens.length).toBe(2); // register(1st) & login(2nd)
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
    await guestServer!.executeOperation({ query: LOGIN, variables: { email, password } }); // 3rd login
    const logoutOtherRes = await userServer.executeOperation({
      query: LOGOUT_OTHER,
      variables: { refreshToken: refreshToken2 },
    });
    apolloExpect(logoutOtherRes, 'data', { logoutOther: { code: MSG_ENUM.COMPLETED, count: 2 } });

    // should fail to renew (register) after being logged out by 2nd login
    const res = await userServer.executeOperation({
      query: RENEW_TOKEN,
      variables: { refreshToken: refreshTokenReg },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_RENEW_TOKEN_ERROR}`);

    // logout 2nd login
    const logoutRes = await userServer.executeOperation({ query: LOGOUT, variables: { refreshToken: refreshToken2 } });
    apolloExpect(logoutRes, 'data', { logout: { code: MSG_ENUM.COMPLETED } });

    // delete registration (deregister)
    const deregisterRes = await userServer.executeOperation({ query: DEREGISTER, variables: { password } });
    apolloExpect(deregisterRes, 'data', { deregister: { code: MSG_ENUM.COMPLETED, days: expect.any(Number) } });
  });

  test('should pass when LoginWithStudentId', async () => {
    expect.assertions(1);

    // create a new user (with loginStudentIds)
    const studentId = randomString();
    const user = genUser(tenantId!, { studentIds: [`${tenantId!}#${studentId}`] });
    const { password } = user; // destructure password before saving. once saved, password is hashed
    await user.save();

    // LoginWithStudentId
    const LoginWithStudentIdRes = await guestServer!.executeOperation({
      query: LOGIN_WITH_STUDENT_ID,
      variables: { studentId, password, tenantId },
    });
    apolloExpect(LoginWithStudentIdRes, 'data', { loginWithStudentId: { ...expectedAuthResponse, conflict: null } });

    // clean-up deregister (remove) test user
    await User.deleteOne({ _id: user });
  });

  test('should pass when (school) tenantAdmin creates a loginToken for user to login', async () => {
    expect.assertions(2);

    // create a new user
    const user = genUser(tenantId!);
    await user.save();
    const userId = user._id.toString();

    // tenantAdmin generates a loginToken
    const tokenRes = await tenantAdminServer!.executeOperation({
      query: LOGIN_TOKEN,
      variables: { tenantId: tenantId!, userId },
    });
    apolloExpect(tokenRes, 'data', { loginToken: expect.any(String) });
    const token = tokenRes.data!.loginToken;

    // new user login with loginToken
    const loginWithTokenRes = await guestServer!.executeOperation({ query: LOGIN_WITH_TOKEN, variables: { token } });
    apolloExpect(loginWithTokenRes, 'data', { loginWithToken: { ...expectedAuthResponse, conflict: null } });

    // clean-up deregister (remove) test user
    await User.deleteOne({ _id: user });
  });

  test('should fail when login with invalid email & password, without password', async () => {
    expect.assertions(3);

    // invalid email
    let res = await guestServer!.executeOperation({
      query: LOGIN,
      variables: { email: INVALID_EMAIL, password: User.genValidPassword() },
    });
    apolloExpect(res, 'errorContaining', 'email must be a valid email');

    // invalid password (too simple)
    res = await guestServer!.executeOperation({
      query: LOGIN,
      variables: { email: VALID_EMAIL, password: INVALID_PASSWORD },
    });
    apolloExpect(res, 'errorContaining', INVALID_PASSWORD_MSG);

    // without password
    res = await guestServer!.executeOperation({ query: LOGIN, variables: { email: INVALID_EMAIL } });
    apolloExpect(res, 'errorContaining', 'Variable "$password" of required type "String!" was not provided.');
  });

  test('should fail when login with wrong password', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: LOGIN,
      variables: { email: normalUser!.emails[0], password: User.genValidPassword() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_CREDENTIALS_ERROR}`);
  });

  test('should fail when login with non-existent user', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({
      query: LOGIN,
      variables: { email: `non-exist-${Date.now()}@test.com`, password: User.genValidPassword() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_CREDENTIALS_ERROR}`);
  });

  test('should fail when login with DELETED user (because of incorrect email format @@)', async () => {
    expect.assertions(1);

    const deletedUser = await User.findOne({ status: USER.STATUS.DELETED });
    if (!deletedUser) throw 'There is NO deleted user in database !!! \n\n';

    const res = await guestServer!.executeOperation({
      query: LOGIN,
      variables: { email: deletedUser.emails[0], password: User.genValidPassword() },
    });
    apolloExpect(res, 'errorContaining', 'email must be a valid email'); // deletedUser has an invalid email
  });

  test('should report conflict when exceeding MAX_LOGIN', async () => {
    expect.assertions(1);

    // register a new user
    const { emails, name, password } = genUser(null);
    const [email] = emails;
    const registerRes = await guestServer!.executeOperation({ query: REGISTER, variables: { name, email, password } });

    for (let i = 0; i < DEFAULTS.AUTH.MAX_LOGIN - 1; i++) {
      await guestServer!.executeOperation({ query: LOGIN, variables: { email, password } });
    }

    const loginRes = await guestServer!.executeOperation({ query: LOGIN, variables: { email, password } });
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

    // clean-up deregister (remove) test user
    const user = await User.findOneActive({ _id: registerRes.data!.register.user });
    await testServer(user).executeOperation({ query: DEREGISTER, variables: { password } });
  });
  test('should report conflict when login with different IP', async () => {
    expect.assertions(1);

    // register a new user
    const { emails, name, password } = genUser(null);
    const [email] = emails;
    const registerRes = await guestServer!.executeOperation({ query: REGISTER, variables: { name, email, password } });
    const { refreshToken } = registerRes.data!.register;

    await Token.updateOne({ token: refreshToken }, { ua: 'Jest-different-IP', ip: 'different-ip' });

    const loginRes = await guestServer!.executeOperation({ query: LOGIN, variables: { email, password } });
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

    // clean-up deregister (remove) test user
    const user = await User.findOneActive({ _id: registerRes.data!.register.user });
    await testServer(user).executeOperation({ query: DEREGISTER, variables: { password } });
  });

  test('should fail when register a user with invalid password', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: REGISTER,
      variables: { name: 'valid name', email: VALID_EMAIL, password: INVALID_PASSWORD },
    });
    apolloExpect(res, 'error', INVALID_PASSWORD_MSG);
  });

  test('should fail when register a user with (duplicated) registered email', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({
      query: REGISTER,
      variables: { name: 'whatever', email: normalUser!.emails[0], password: User.genValidPassword() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED}`);
  });

  test('should fail when register a user without providing name, email & password', async () => {
    expect.assertions(3);
    const email = VALID_EMAIL;
    const password = User.genValidPassword();
    const name = 'Valid Name';

    // without email
    let res = await guestServer!.executeOperation({ query: REGISTER, variables: { password, name } });
    apolloExpect(res, 'errorContaining', 'Variable "$email" of required type "String!" was not provided.');

    // without password
    res = await guestServer!.executeOperation({ query: REGISTER, variables: { email, name } });
    apolloExpect(res, 'errorContaining', 'Variable "$password" of required type "String!" was not provided.');

    // without name
    res = await guestServer!.executeOperation({ query: REGISTER, variables: { email, password } });
    apolloExpect(res, 'errorContaining', 'Variable "$name" of required type "String!" was not provided.');
  });
});
