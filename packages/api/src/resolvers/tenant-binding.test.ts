/**
 * Jest: /resolvers/tenant-binding
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
  expectedUserFormatApollo,
  jestSetup,
  jestTeardown,
  prob,
  testServer,
  uniqueTestUser,
} from '../jest';
import User from '../models/user';
import { BIND_TENANT, GET_TENANT_TOKEN, UNBIND_TENANT } from '../queries/tenant-binding';

const { MSG_ENUM } = LOCALE;

// Top contact of this test suite:
describe('TenantBinding GraphQL', () => {
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let tenantAdminServer: ApolloServer | null;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ guestServer, normalServer, tenantAdminServer, tenantId } = await jestSetup(['guest', 'normal', 'tenantAdmin'], {
      apollo: true,
    }));
  });
  afterAll(jestTeardown);

  test('should fail when trying to createToken (as normalUser)', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({
      query: GET_TENANT_TOKEN,
      variables: { tenantId: tenantId!, ...(prob(0.5) && { expiresIn: 11 }) },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should fail when trying to createToken (as guest)', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({
      query: GET_TENANT_TOKEN,
      variables: { tenantId: tenantId!, ...(prob(0.5) && { expiresIn: 11 }) },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should pass the full suite (createToken, bind, unbind)', async () => {
    expect.assertions(3);

    // create a new user (without tenants)
    const { email, name, password } = uniqueTestUser();
    const user = await User.create({ tenants: [], name: `tenant-binding-${name}`, emails: [email], password });
    const userServer = testServer(user);

    // tenantAdmin creates token
    const tokenRes = await tenantAdminServer!.executeOperation({
      query: GET_TENANT_TOKEN,
      variables: { tenantId: tenantId!, ...(prob(0.5) && { expiresIn: 10 }) },
    });
    apolloExpect(tokenRes, 'data', {
      tenantToken: { token: expect.any(String), expireAt: expect.any(Number) },
    });

    // user binds himself to tenant
    const bindRes = await userServer.executeOperation({
      query: BIND_TENANT,
      variables: { token: tokenRes.data!.tenantToken.token },
    });
    apolloExpect(bindRes, 'data', {
      bindTenant: expect.objectContaining({ ...expectedUserFormatApollo, tenants: [tenantId!] }),
    });

    // tenantAdmin unbind user
    const unBindRes = await tenantAdminServer!.executeOperation({
      query: UNBIND_TENANT,
      variables: { tenantId: tenantId!, userId: user._id.toString() },
    });
    apolloExpect(unBindRes, 'data', {
      unbindTenant: expect.objectContaining({ ...expectedUserFormatApollo, tenants: [] }),
    });
  });

  test('should fail when creating a tenantToken with invalid parameters', async () => {
    expect.assertions(2);
    const res1 = await guestServer!.executeOperation({ query: GET_TENANT_TOKEN, variables: { expiresIn: 10 } });
    apolloExpect(res1, 'error', 'Variable "$tenantId" of required type "String!" was not provided.');

    const invalid = 'INVALID';
    const res2 = await guestServer!.executeOperation({
      query: GET_TENANT_TOKEN,
      variables: { tenantId: tenantId!, expiresIn: invalid },
    });
    apolloExpect(
      res2,
      'error',
      `Variable "$expiresIn" got invalid value "${invalid}"; Int cannot represent non-integer value: "${invalid}"`,
    );
  });
});
