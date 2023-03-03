/**
 * Jest: /resolvers/level
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  apolloExpect,
  ApolloServer,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2_LOCALE,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
} from '../jest';
import Level from '../models/level';
import type { UserDocument } from '../models/user';
import { ADD_LEVEL, ADD_LEVEL_REMARK, GET_LEVEL, GET_LEVELS, REMOVE_LEVEL, UPDATE_LEVEL } from '../queries/level';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('Level GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: LeanDocument<UserDocument> | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    nextLevel: expect.toBeOneOf([null, expect.any(String)]),
    remarks: null,
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  const expectedAdminFormat = {
    ...expectedNormalFormat,
    remarks: expect.any(Array), // could be empty array without any remarks
  };

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer } = await jestSetup(['admin', 'guest', 'normal'], {
      apollo: true,
    }));
  });
  afterAll(jestTeardown);

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_LEVELS });
    apolloExpect(res, 'data', { levels: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: GET_LEVELS,
      variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
    });
    apolloExpect(res, 'data', { levels: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const levels = await Level.find({ deletedAt: { $exists: false } }).lean();
    const res = await guestServer!.executeOperation({ query: GET_LEVEL, variables: { id: randomId(levels) } });
    apolloExpect(res, 'data', { level: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_LEVEL });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_LEVEL, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await normalServer!.executeOperation({
      query: ADD_LEVEL,
      variables: { level: { code: FAKE, name: FAKE_LOCALE } },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await normalServer!.executeOperation({
      query: ADD_LEVEL_REMARK,
      variables: { id: FAKE, remark: FAKE },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD, ADD_REMARK & UPDATE & DELETE', async () => {
    expect.assertions(4);

    // add a document
    const createdRes = await adminServer!.executeOperation({
      query: ADD_LEVEL,
      variables: { level: { code: FAKE, name: FAKE_LOCALE } },
    });
    apolloExpect(createdRes, 'data', { addLevel: expectedAdminFormat });
    const newId: string = createdRes.data!.addLevel._id;

    // add remark
    const addRemarkRes = await adminServer!.executeOperation({
      query: ADD_LEVEL_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addLevelRemark: { ...expectedAdminFormat, ...expectedRemark(adminUser!, FAKE, true) },
    });

    // update newly created document
    const updatedRes = await adminServer!.executeOperation({
      query: UPDATE_LEVEL,
      variables: {
        id: newId,
        level: { code: FAKE, name: FAKE2_LOCALE },
      },
    });
    apolloExpect(updatedRes, 'data', { updateLevel: expectedAdminFormat });

    // delete newly created document
    const removedRes = await adminServer!.executeOperation({
      query: REMOVE_LEVEL,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeLevel: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD without name or code', async () => {
    expect.assertions(2);

    // add without code
    const res1 = await adminServer!.executeOperation({ query: ADD_LEVEL, variables: { level: { name: FAKE_LOCALE } } });
    apolloExpect(res1, 'errorContaining', 'Field "code" of required type "String!" was not provided.');

    // add without name
    const res2 = await adminServer!.executeOperation({ query: ADD_LEVEL, variables: { level: { code: FAKE } } });
    apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');
  });
});
