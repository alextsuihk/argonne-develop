/**
 * Jest: /resolvers/user
 */

import { LOCALE } from '@argonne/common';

import configLoader from '../config/config-loader';
import { apolloContext, apolloExpect, apolloTestServer, genUser, jestSetup, jestTeardown, randomString } from '../jest';
import User from '../models/user';
import { CHANGE_PASSWORD, RESET_PASSWORD_CONFIRM, RESET_PASSWORD_REQUEST } from '../queries/password';
import token, { PASSWORD_TOKEN_PREFIX, REFRESH_TOKEN_PREFIX } from '../utils/token';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

describe('Authentication GraphQL (token)', () => {
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
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: CHANGE_PASSWORD, variables: { currPassword: oldPassword, newPassword: oldPassword, refreshToken } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should response "completed" when changing password', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      {
        query: CHANGE_PASSWORD,
        variables: { currPassword: oldPassword, newPassword: User.genValidPassword(), refreshToken },
      },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res, 'data', { changePassword: { code: MSG_ENUM.COMPLETED } });
  });

  test('should response "completed"when request password reset', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: RESET_PASSWORD_REQUEST, variables: { email: user.emails[0] } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { resetPasswordRequest: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when confirm password reset with an invalid token', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: RESET_PASSWORD_CONFIRM, variables: { token: 'invalid', password: User.genValidPassword() } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.TOKEN_ERROR}`);
  });

  test('should pass when confirm password reset with an valid token', async () => {
    expect.assertions(1);

    const resetToken = await token.signStrings(
      [PASSWORD_TOKEN_PREFIX, user._id.toString()],
      DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN,
    );

    const res = await apolloTestServer.executeOperation(
      { query: RESET_PASSWORD_CONFIRM, variables: { token: resetToken, password: User.genValidPassword() } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { resetPasswordConfirm: { code: MSG_ENUM.COMPLETED } });
  });
});
