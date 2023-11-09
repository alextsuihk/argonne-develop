/**
 * Jest: /resolvers/tag
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';

import configLoader from '../config/config-loader';
import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
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
} from '../jest';
import type { TagDocument } from '../models/tag';
import Tag from '../models/tag';
import { ADD_TAG, ADD_TAG_REMARK, GET_TAG, GET_TAGS, REMOVE_TAG, UPDATE_TAG } from '../queries/tag';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

// Top level of this test suite:
describe('Tag GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    description: expectedLocaleFormat,
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

    const res = await apolloTestServer.executeOperation({ query: GET_TAGS }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'data', { tags: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: GET_TAGS, variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { tags: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const tags = await Tag.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(tags)._id.toString();
    const res = await apolloTestServer.executeOperation(
      { query: GET_TAG, variables: { id } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { tag: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation({ query: GET_TAG }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_TAG, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without ADMIN role & without sufficient creditability', async () => {
    expect.assertions(2);

    const user = jest.normalUsers.find(user => user.creditability < DEFAULTS.CREDITABILITY.CREATE_TAG);
    if (!user) throw 'no valid user to proceed';

    // add a document
    const res = await apolloTestServer.executeOperation(
      { query: ADD_TAG, variables: { tag: { name: FAKE_LOCALE, description: FAKE2_LOCALE } } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // add remark
    const res3 = await apolloTestServer.executeOperation(
      { query: ADD_TAG_REMARK, variables: { id: FAKE, remark: FAKE } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res3, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD & UPDATE & DELETE', async () => {
    expect.assertions(6);

    // add a document
    const createdRes = await apolloTestServer.executeOperation<{ addTag: TagDocument }>(
      { query: ADD_TAG, variables: { tag: { name: FAKE_LOCALE, description: FAKE2_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(createdRes, 'data', { addTag: expectedAdminFormat });
    const newId = createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addTag._id.toString() : null;

    // update without sufficient creditability
    const user = jest.normalUsers.find(user => user.creditability < DEFAULTS.CREDITABILITY.UPDATE_TAG);
    if (!user) throw 'no valid user to proceed';
    const updatedFailRes = await apolloTestServer.executeOperation(
      { query: UPDATE_TAG, variables: { id: newId, tag: { name: FAKE2_LOCALE, description: FAKE_LOCALE } } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(updatedFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // update newly created document
    const updatedRes = await apolloTestServer.executeOperation(
      {
        query: UPDATE_TAG,
        variables: { id: newId, tag: { name: FAKE2_LOCALE, description: FAKE_LOCALE } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(updatedRes, 'data', { updateTag: expectedAdminFormat });

    // add remark
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_TAG_REMARK, variables: { id: newId, remark: FAKE } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(addRemarkRes, 'data', {
      addTagRemark: { ...expectedAdminFormat, ...expectedRemark(jest.adminUser._id, FAKE, true) },
    });

    // delete without sufficient creditability
    const user2 = jest.normalUsers.find(user => user.creditability < DEFAULTS.CREDITABILITY.REMOVE_TAG);
    if (!user2) throw 'no valid user to proceed';
    const removedFailRes = await apolloTestServer.executeOperation(
      { query: REMOVE_TAG, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(user2) },
    );
    apolloExpect(removedFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // delete newly created document
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_TAG, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(removedRes, 'data', { removeTag: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD without name', async () => {
    expect.assertions(2);

    // add without name
    let res = await apolloTestServer.executeOperation(
      { query: ADD_TAG, variables: { tag: { description: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');

    // add without description
    res = await apolloTestServer.executeOperation(
      { query: ADD_TAG, variables: { tag: { name: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res, 'errorContaining', 'Field "description" of required type "LocaleInput!" was not provided.');
  });
});
