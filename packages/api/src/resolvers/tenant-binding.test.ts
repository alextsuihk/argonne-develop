/**
 * Jest: /resolvers/tenant-binding
 *
 */

import { LOCALE } from '@argonne/common';

import type { TokenWithExpireAtResponse } from '../controllers/common';
import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedDateFormat,
  genUser,
  jestSetup,
  jestTeardown,
  prob,
  randomString,
} from '../jest';
import User from '../models/user';
import { BIND_TENANT, GET_TENANT_TOKEN, UNBIND_TENANT } from '../queries/tenant-binding';
import token, { REFRESH_TOKEN_PREFIX } from '../utils/token';

const { MSG_ENUM } = LOCALE;

// Top contact of this test suite:
describe('TenantBinding GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should fail when trying to createToken (as normalUser)', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_TENANT_TOKEN, variables: { tenantId: jest.tenantId, ...(prob(0.5) && { expiresIn: 11 }) } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should fail when trying to createToken (as guest)', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_TENANT_TOKEN, variables: { tenantId: jest.tenantId, ...(prob(0.5) && { expiresIn: 11 }) } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should pass the full suite (createToken, bind, unbind)', async () => {
    expect.assertions(5);

    const user = genUser(null); // create a new user (without tenants)

    const [refreshToken] = await Promise.all([
      token.signStrings([REFRESH_TOKEN_PREFIX, user._id.toString(), randomString()], 10),
      user.save(),
    ]);

    // tenantAdmin creates token
    const tokenRes = await apolloTestServer.executeOperation<{ tenantToken: TokenWithExpireAtResponse }>(
      { query: GET_TENANT_TOKEN, variables: { tenantId: jest.tenantId, ...(prob(0.5) && { expiresIn: 10 }) } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(tokenRes, 'data', {
      tenantToken: { token: expect.any(String), expireAt: expectedDateFormat(true) },
    });
    const bindingToken = tokenRes.body.kind === 'single' ? tokenRes.body.singleResult.data!.tenantToken.token : null;

    // user binds himself to tenant
    const bindRes = await apolloTestServer.executeOperation(
      {
        query: BIND_TENANT,
        variables: { bindingToken, refreshToken, ...(prob(0.5) && { studentId: randomString() }) },
      },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(bindRes, 'data', { bindTenant: { code: MSG_ENUM.COMPLETED } });

    // check if binding is successful
    const updatedUser = await User.findOne({ _id: user._id }).lean();
    expect(updatedUser?.tenants.some(t => t.equals(jest.tenantId))).toBeTrue();

    // tenantAdmin unbind user
    const unBindRes = await apolloTestServer.executeOperation(
      { query: UNBIND_TENANT, variables: { tenantId: jest.tenantId, userId: user._id.toString() } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(unBindRes, 'data', { unbindTenant: { code: MSG_ENUM.COMPLETED } });

    // check if unbinding is successful
    const updated2User = await User.findOne({ _id: user._id }).lean();
    expect(updated2User?.tenants.some(t => t.equals(jest.tenantId))).toBeFalse();

    // clean up
    await User.deleteOne({ _id: user._id });
  });

  test('should fail when creating a tenantToken with invalid parameters', async () => {
    expect.assertions(2);
    const res1 = await apolloTestServer.executeOperation(
      { query: GET_TENANT_TOKEN, variables: { expiresIn: 10 } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res1, 'error', 'Variable "$tenantId" of required type "String!" was not provided.');

    const invalid = 'INVALID';
    const res2 = await apolloTestServer.executeOperation(
      { query: GET_TENANT_TOKEN, variables: { tenantId: jest.tenantId, expiresIn: invalid } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(
      res2,
      'error',
      `Variable "$expiresIn" got invalid value "${invalid}"; Int cannot represent non-integer value: "${invalid}"`,
    );
  });
});
