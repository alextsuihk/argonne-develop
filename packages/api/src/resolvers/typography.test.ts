/**
 * Jest: /resolvers/typography
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
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
import Typography from '../models/typography';
import type { UserDocument } from '../models/user';
import {
  ADD_CUSTOM_TYPOGRAPHY,
  ADD_TYPOGRAPHY,
  ADD_TYPOGRAPHY_REMARK,
  GET_TYPOGRAPHIES,
  GET_TYPOGRAPHY,
  REMOVE_CUSTOM_TYPOGRAPHY,
  REMOVE_TYPOGRAPHY,
  UPDATE_TYPOGRAPHY,
} from '../queries/typography';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('Typography GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: UserDocument | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let tenantAdminServer: ApolloServer | null;
  let tenantId: string | null;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    key: expect.any(String),
    title: expectedLocaleFormat,
    content: expectedLocaleFormat,
    customs: expect.any(Array),
    remarks: null,
    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  const expectedAdminFormat = {
    ...expectedNormalFormat,
    remarks: expect.any(Array),
  };

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer, tenantAdminServer, tenantId } = await jestSetup(
      ['admin', 'guest', 'normal', 'tenantAdmin'],
      { apollo: true },
    ));
  });
  afterAll(jestTeardown);

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_TYPOGRAPHIES });
    apolloExpect(res, 'data', {
      typographies: expect.arrayContaining([expectedNormalFormat]),
    });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({
      query: GET_TYPOGRAPHIES,
      variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
    });
    apolloExpect(res, 'data', {
      typographies: expect.arrayContaining([expectedNormalFormat]),
    });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);
    const typographies = await Typography.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(typographies)._id.toString();
    const res = await guestServer!.executeOperation({ query: GET_TYPOGRAPHY, variables: { id } });
    apolloExpect(res, 'data', { typography: expectedNormalFormat });
  });

  test('should response an array of data when GET all (as admin)', async () => {
    expect.assertions(1);
    const res = await adminServer!.executeOperation({ query: GET_TYPOGRAPHIES });
    apolloExpect(res, 'data', { typographies: expect.arrayContaining([expectedAdminFormat]) });
  });

  test('should response a single object when GET One by ID (as admin)', async () => {
    expect.assertions(1);
    const typographies = await Typography.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(typographies)._id.toString();
    const res = await adminServer!.executeOperation({ query: GET_TYPOGRAPHY, variables: { id } });
    apolloExpect(res, 'data', { typography: expectedAdminFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_TYPOGRAPHY });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_TYPOGRAPHY, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without login', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({
      query: ADD_TYPOGRAPHY,
      variables: { typography: { key: FAKE, title: FAKE_LOCALE, content: FAKE_LOCALE } },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);
    const res = await normalServer!.executeOperation({
      query: ADD_TYPOGRAPHY,
      variables: { typography: { key: FAKE, title: FAKE_LOCALE, content: FAKE_LOCALE } },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    const res2 = await normalServer!.executeOperation({
      query: ADD_TYPOGRAPHY_REMARK,
      variables: { id: FAKE, remark: FAKE },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when CREATE, UPDATE,  addCustom, removeCustom, REMOVE & verify-REMOVE', async () => {
    expect.assertions(7);

    // add a document
    const createdRes = await adminServer!.executeOperation({
      query: ADD_TYPOGRAPHY,
      variables: { typography: { key: FAKE, title: FAKE_LOCALE, content: FAKE2_LOCALE } },
    });
    apolloExpect(createdRes, 'data', { addTypography: expectedAdminFormat });
    const newId: string = createdRes.data!.addTypography._id;

    // add remark
    const addRemarkRes = await adminServer!.executeOperation({
      query: ADD_TYPOGRAPHY_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addTypographyRemark: { ...expectedAdminFormat, ...expectedRemark(adminUser!._id, FAKE, true) },
    });

    // update newly created document
    const updateRes = await adminServer!.executeOperation({
      query: UPDATE_TYPOGRAPHY,
      variables: { id: newId, typography: { key: FAKE, title: FAKE2_LOCALE, content: FAKE_LOCALE } },
    });
    apolloExpect(updateRes, 'data', { updateTypography: expectedAdminFormat });

    // add custom typography
    const addCustomRes = await tenantAdminServer!.executeOperation({
      query: ADD_CUSTOM_TYPOGRAPHY,
      variables: { id: newId, tenantId, custom: { title: FAKE2_LOCALE, content: FAKE_LOCALE } },
    });

    apolloExpect(addCustomRes, 'data', { addCustomTypography: expectedNormalFormat });

    // change custom typography
    const addCustomRes2 = await tenantAdminServer!.executeOperation({
      query: ADD_CUSTOM_TYPOGRAPHY,
      variables: { id: newId, tenantId, custom: { title: FAKE_LOCALE, content: FAKE2_LOCALE } },
    });
    apolloExpect(addCustomRes2, 'data', { addCustomTypography: expectedNormalFormat });

    // remove custom typography
    const removeCustomRes = await tenantAdminServer!.executeOperation({
      query: REMOVE_CUSTOM_TYPOGRAPHY,
      variables: { id: newId, tenantId },
    });
    apolloExpect(removeCustomRes, 'data', { removeCustomTypography: expectedNormalFormat });

    // delete newly created document
    const removeRes = await adminServer!.executeOperation({
      query: REMOVE_TYPOGRAPHY,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removeRes, 'data', { removeTypography: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD without key, title or content', async () => {
    expect.assertions(3);

    // add without key
    const res1 = await adminServer!.executeOperation({
      query: ADD_TYPOGRAPHY,
      variables: { typography: { title: FAKE_LOCALE, content: FAKE_LOCALE } },
    });
    apolloExpect(res1, 'errorContaining', 'Field "key" of required type "String!" was not provided.');

    // add without title
    const res2 = await adminServer!.executeOperation({
      query: ADD_TYPOGRAPHY,
      variables: { typography: { key: FAKE, content: FAKE_LOCALE } },
    });
    apolloExpect(res2, 'errorContaining', 'Field "title" of required type "LocaleInput!" was not provided.');

    // add without content
    const res3 = await adminServer!.executeOperation({
      query: ADD_TYPOGRAPHY,
      variables: { typography: { key: FAKE, title: FAKE_LOCALE } },
    });
    apolloExpect(res3, 'errorContaining', 'Field "content" of required type "LocaleInput!" was not provided.');
  });
});
