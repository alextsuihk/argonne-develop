/**
 * Jest: /resolvers/tag
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';

import configLoader from '../config/config-loader';
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
  shuffle,
  testServer,
} from '../jest';
import Tag from '../models/tag';
import type { Id, UserDocument } from '../models/user';
import { ADD_TAG, ADD_TAG_REMARK, GET_TAG, GET_TAGS, REMOVE_TAG, UPDATE_TAG } from '../queries/tag';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

// Top level of this test suite:
describe('Tag GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: (UserDocument & Id) | null;
  let guestServer: ApolloServer | null;
  let normalUsers: (UserDocument & Id)[] | null;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    description: expectedLocaleFormat,
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
    ({ adminServer, adminUser, guestServer, normalUsers } = await jestSetup(['admin', 'guest', 'normal'], {
      apollo: true,
    }));
  });
  afterAll(jestTeardown);

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_TAGS });
    apolloExpect(res, 'data', { tags: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: GET_TAGS,
      variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
    });
    apolloExpect(res, 'data', { tags: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const tags = await Tag.find({ deletedAt: { $exists: false } }).lean();
    const res = await guestServer!.executeOperation({ query: GET_TAG, variables: { id: randomId(tags) } });
    apolloExpect(res, 'data', { tag: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_TAG });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_TAG, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without ADMIN role & without sufficient creditability', async () => {
    expect.assertions(2);

    const user = normalUsers!.sort(shuffle).find(user => user.creditability < DEFAULTS.CREDITABILITY.CREATE_TAG);
    const userServer = testServer(user);

    // add a document
    const res = await userServer.executeOperation({
      query: ADD_TAG,
      variables: { tag: { name: FAKE_LOCALE, description: FAKE2_LOCALE } },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // add remark
    const res3 = await userServer.executeOperation({
      query: ADD_TAG_REMARK,
      variables: { id: FAKE, remark: FAKE },
    });
    apolloExpect(res3, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD & UPDATE & DELETE', async () => {
    expect.assertions(6);

    // add a document
    const createdRes = await adminServer!.executeOperation({
      query: ADD_TAG,
      variables: { tag: { name: FAKE_LOCALE, description: FAKE2_LOCALE } },
    });
    apolloExpect(createdRes, 'data', { addTag: expectedAdminFormat });
    const newId: string = createdRes.data!.addTag._id;

    // update without sufficient creditability
    const user = normalUsers!.sort(shuffle).find(user => user.creditability < DEFAULTS.CREDITABILITY.UPDATE_TAG);
    const updatedFailRes = await testServer(user!).executeOperation({
      query: UPDATE_TAG,
      variables: { id: newId, tag: { name: FAKE2_LOCALE, description: FAKE_LOCALE } },
    });
    apolloExpect(updatedFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // update newly created document
    const updatedRes = await adminServer!.executeOperation({
      query: UPDATE_TAG,
      variables: { id: newId, tag: { name: FAKE2_LOCALE, description: FAKE_LOCALE } },
    });
    apolloExpect(updatedRes, 'data', { updateTag: expectedAdminFormat });

    // add remark
    const addRemarkRes = await adminServer!.executeOperation({
      query: ADD_TAG_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addTagRemark: { ...expectedAdminFormat, ...expectedRemark(adminUser!._id, FAKE, true) },
    });

    // delete without sufficient creditability
    const user2 = normalUsers!.sort(shuffle).find(user => user.creditability < DEFAULTS.CREDITABILITY.REMOVE_TAG);
    const removedFailRes = await testServer(user2!).executeOperation({
      query: REMOVE_TAG,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // delete newly created document
    const removedRes = await adminServer!.executeOperation({
      query: REMOVE_TAG,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeTag: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD without name', async () => {
    expect.assertions(2);

    // add without name
    let res = await adminServer!.executeOperation({ query: ADD_TAG, variables: { tag: { description: FAKE_LOCALE } } });
    apolloExpect(res, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');

    // add without description
    res = await adminServer!.executeOperation({ query: ADD_TAG, variables: { tag: { name: FAKE_LOCALE } } });
    apolloExpect(res, 'errorContaining', 'Field "description" of required type "LocaleInput!" was not provided.');
  });
});
