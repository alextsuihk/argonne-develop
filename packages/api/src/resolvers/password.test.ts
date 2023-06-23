/**
 * Jest: /resolvers/user
 */

import { LOCALE } from '@argonne/common';

import configLoader from '../config/config-loader';
import { PASSWORD_TOKEN_PREFIX } from '../controllers/password';
import { apolloExpect, ApolloServer, jestSetup, jestTeardown, testServer, uniqueTestUser } from '../jest';
import User from '../models/user';
import { DEREGISTER, REGISTER } from '../queries/auth';
import { CHANGE_PASSWORD, RESET_PASSWORD_CONFIRM, RESET_PASSWORD_REQUEST } from '../queries/password';
import token from '../utils/token';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

describe('Authentication GraphQL (token)', () => {
  let guestServer: ApolloServer | null;
  let userServer: ApolloServer;
  let refreshToken: string;
  let userId: string;

  const { email, name, password: oldPassword } = uniqueTestUser();
  const newPassword = User.genValidPassword();

  beforeAll(async () => {
    ({ guestServer } = await jestSetup(['guest'], { apollo: true }));
    const res = await guestServer!.executeOperation({
      query: REGISTER,
      variables: { email, name, password: oldPassword },
    });
    ({ refreshToken } = res.data!.register);
    const user = await User.findOneActive({ _id: res.data!.register.user });
    userId = user!._id.toString();
    userServer = testServer(user);
  });
  afterAll(async () => {
    await userServer.executeOperation({ query: DEREGISTER, variables: { password: newPassword } });
    await jestTeardown();
  });

  test('should fail when changing newPassword (same as current password)', async () => {
    expect.assertions(1);

    const res = await userServer.executeOperation({
      query: CHANGE_PASSWORD,
      variables: { currPassword: oldPassword, newPassword: oldPassword, refreshToken },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should response "completed" when changing password', async () => {
    expect.assertions(1);

    const res = await userServer.executeOperation({
      query: CHANGE_PASSWORD,
      variables: { currPassword: oldPassword, newPassword: newPassword, refreshToken },
    });
    apolloExpect(res, 'data', { changePassword: { code: MSG_ENUM.COMPLETED } });
  });

  test('should response "completed"when request password reset', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: RESET_PASSWORD_REQUEST, variables: { email } });
    apolloExpect(res, 'data', { resetPasswordRequest: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when confirm password reset with an invalid token', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: RESET_PASSWORD_CONFIRM,
      variables: { token: 'invalid', password: newPassword },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.TOKEN_ERROR}`);
  });

  test('should pass when confirm password reset with an valid token', async () => {
    expect.assertions(1);

    const resetToken = await token.signStrings(
      [PASSWORD_TOKEN_PREFIX, userId],
      DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN,
    );

    const res = await guestServer!.executeOperation({
      query: RESET_PASSWORD_CONFIRM,
      variables: { token: resetToken, password: newPassword },
    });
    apolloExpect(res, 'data', { resetPasswordConfirm: { code: MSG_ENUM.COMPLETED } });
  });
});
