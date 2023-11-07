/**
 * Jest: /resolvers/level
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  apolloContext,
  expectedDateFormat,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2_LOCALE,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  apolloTestServer,
} from '../jest';
import type { LevelDocument } from '../models/level';
import Level from '../models/level';
import type { UserDocument } from '../models/user';
import { ADD_LEVEL, ADD_LEVEL_REMARK, GET_LEVEL, GET_LEVELS, REMOVE_LEVEL, UPDATE_LEVEL } from '../queries/level';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('Level GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    nextLevel: expect.toBeOneOf([null, expectedIdFormat]),
    remarks: null,
    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  const expectedAdminFormat = {
    ...expectedNormalFormat,
    remarks: expect.any(Array), // could be empty array without any remarks
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation({ query: GET_LEVELS }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'data', { levels: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      {
        query: GET_LEVELS,
        variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
      },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { levels: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const levels = await Level.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(levels)._id.toString();
    const res = await apolloTestServer.executeOperation(
      { query: GET_LEVEL, variables: { id } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { level: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation({ query: GET_LEVEL }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_LEVEL, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await apolloTestServer.executeOperation(
      { query: ADD_LEVEL, variables: { level: { code: FAKE, name: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_LEVEL_REMARK, variables: { id: FAKE, remark: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD, ADD_REMARK & UPDATE & DELETE', async () => {
    expect.assertions(4);

    // add a document
    const createdRes = await apolloTestServer.executeOperation<{ addLevel: LevelDocument }>(
      { query: ADD_LEVEL, variables: { level: { code: FAKE, name: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(createdRes, 'data', {
      addLevel: { ...expectedAdminFormat, code: FAKE.toUpperCase(), name: FAKE_LOCALE },
    });
    const newId = createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addLevel._id.toString() : null;

    // add remark
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_LEVEL_REMARK, variables: { id: newId, remark: FAKE } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(addRemarkRes, 'data', {
      addLevelRemark: { ...expectedAdminFormat, ...expectedRemark(jest.adminUser._id, FAKE, true) },
    });

    // update newly created document
    const updatedRes = await apolloTestServer.executeOperation(
      { query: UPDATE_LEVEL, variables: { id: newId, level: { code: FAKE, name: FAKE2_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(updatedRes, 'data', { updateLevel: { ...expectedAdminFormat, name: FAKE2_LOCALE } });

    // delete newly created document
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_LEVEL, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(removedRes, 'data', { removeLevel: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD without name or code', async () => {
    expect.assertions(2);

    // add without code
    const res1 = await apolloTestServer.executeOperation(
      { query: ADD_LEVEL, variables: { level: { name: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res1, 'errorContaining', 'Field "code" of required type "String!" was not provided.');

    // add without name
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_LEVEL, variables: { level: { code: FAKE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');
  });
});
