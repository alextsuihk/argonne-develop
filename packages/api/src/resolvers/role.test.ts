/**
 * Jest: /resolvers/role
 *
 */

import { LOCALE } from '@argonne/common';

import { apolloExpect, ApolloServer, jestSetup, jestTeardown } from '../jest';
import type { Id, UserDocument } from '../models/user';
import { ADD_ROLE, GET_ROLE, REMOVE_ROLE } from '../queries/role';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;

// Top role of this test suite:
describe('Role GraphQL', () => {
  const role = USER.ROLE.JEST_FAKE_ROLE;

  let adminUser: (UserDocument & Id) | null;
  let adminServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUser: (UserDocument & Id) | null;

  beforeAll(async () => {
    ({ adminServer, adminUser, normalServer, normalUser } = await jestSetup(['admin', 'normal'], { apollo: true }));
  });
  afterAll(jestTeardown);

  test('should response a single object when GET One by ID (as admin)', async () => {
    // test with adminUser, all other users should have NO default roles
    expect.assertions(1);

    const res = await adminServer!.executeOperation({ query: GET_ROLE, variables: { id: adminUser!._id.toString() } });
    apolloExpect(res, 'data', { role: expect.arrayContaining([expect.any(String)]) });
  });

  test('should fail when GET role without ID argument', async () => {
    expect.assertions(1);

    const res = await adminServer!.executeOperation({ query: GET_ROLE });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET role without valid Mongo ID argument', async () => {
    expect.assertions(1);

    const res = await adminServer!.executeOperation({ query: GET_ROLE, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    const userId = normalUser!._id.toString();

    // add role
    const res1 = await normalServer!.executeOperation({ query: ADD_ROLE, variables: { id: userId, role } });
    apolloExpect(res1, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // remove role
    const res2 = await normalServer!.executeOperation({ query: REMOVE_ROLE, variables: { id: userId, role } });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when get myRoles, add role, and then remove', async () => {
    expect.assertions(3);

    const userId = normalUser!._id.toString();

    // try to delete a role (which user does not have)
    const invalidRemoveRes2 = await adminServer!.executeOperation({
      query: REMOVE_ROLE,
      variables: { id: userId, role },
    });
    apolloExpect(invalidRemoveRes2, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // add valid role
    const addRoleRes = await adminServer!.executeOperation({ query: ADD_ROLE, variables: { id: userId, role } });
    apolloExpect(addRoleRes, 'data', { addRole: expect.arrayContaining([role]) });

    // delete role
    const removeRoleRes = await adminServer!.executeOperation({
      query: REMOVE_ROLE,
      variables: { id: userId, role },
    });
    apolloExpect(removeRoleRes, 'data', { removeRole: expect.not.arrayContaining([role]) });
  });

  test('should fail when add & remove invalid role', async () => {
    expect.assertions(2);

    const userId = normalUser!._id.toString();

    // add invalid role
    const res1 = await adminServer!.executeOperation({
      query: ADD_ROLE,
      variables: { id: userId.toString(), role: `INVALID-ROLE` },
    });
    apolloExpect(res1, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // delete invalid role
    const res2 = await adminServer!.executeOperation({
      query: REMOVE_ROLE,
      variables: { id: userId.toString(), role: `INVALID-ROLE` },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without required fields', async () => {
    expect.assertions(4);

    const userId = normalUser!._id.toString();

    // add without role
    const res1 = await adminServer!.executeOperation({ query: ADD_ROLE, variables: { id: userId } });
    apolloExpect(res1, 'error', 'Variable "$role" of required type "String!" was not provided.');

    // add without id
    const res2 = await adminServer!.executeOperation({ query: ADD_ROLE, variables: { role } });
    apolloExpect(res2, 'error', 'Variable "$id" of required type "ID!" was not provided.');

    // remove without role
    const res3 = await adminServer!.executeOperation({ query: ADD_ROLE, variables: { id: userId } });
    apolloExpect(res3, 'error', 'Variable "$role" of required type "String!" was not provided.');

    // remove without id
    const res4 = await adminServer!.executeOperation({ query: ADD_ROLE, variables: { role } });
    apolloExpect(res4, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });
});
