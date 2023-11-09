/**
 * Jest: /resolvers/district
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';

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
import type { DistrictDocument } from '../models/district';
import District from '../models/district';
import {
  ADD_DISTRICT,
  ADD_DISTRICT_REMARK,
  GET_DISTRICT,
  GET_DISTRICTS,
  REMOVE_DISTRICT,
  UPDATE_DISTRICT,
} from '../queries/district';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('District GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    region: expectedLocaleFormat,
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

    const res = await apolloTestServer.executeOperation(
      { query: GET_DISTRICTS },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { districts: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const districts = await District.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(districts)._id.toString();

    const res = await apolloTestServer.executeOperation(
      { query: GET_DISTRICT, variables: { id } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { district: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation({ query: GET_DISTRICT }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_DISTRICT, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document (as normal user)
    const res = await apolloTestServer.executeOperation(
      { query: ADD_DISTRICT, variables: { district: { name: FAKE_LOCALE, region: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark (as normal user)
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_DISTRICT_REMARK, variables: { id: FAKE, remark: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD, ADD_REMARK, & UPDATE & DELETE', async () => {
    let assertions = 0;

    // add a document (as admin)
    const create = { name: FAKE_LOCALE, region: FAKE2_LOCALE };
    const createdRes = await apolloTestServer.executeOperation<{ addDistrict: DistrictDocument }>(
      { query: ADD_DISTRICT, variables: { district: create } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    assertions += apolloExpect(createdRes, 'data', { addDistrict: { ...expectedAdminFormat, ...create } });
    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addDistrict._id.toString() : null;

    // add remark
    const remark = `addRemark: ${FAKE}`;
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_DISTRICT_REMARK, variables: { id: newId, remark } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    assertions += apolloExpect(addRemarkRes, 'data', {
      addDistrictRemark: { ...expectedAdminFormat, ...expectedRemark(jest.adminUser._id, remark, true) },
    });

    // update newly created document
    const update = { name: FAKE2_LOCALE, region: FAKE_LOCALE };
    const updatedRes = await apolloTestServer.executeOperation(
      { query: UPDATE_DISTRICT, variables: { id: newId, district: update } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    assertions += apolloExpect(updatedRes, 'data', { updateDistrict: { ...expectedAdminFormat, ...update } });

    // delete newly created document
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_DISTRICT, variables: { id: newId, ...(prob(0.5) && { remark: `remove: ${FAKE}` }) } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    assertions += apolloExpect(removedRes, 'data', { removeDistrict: { code: MSG_ENUM.COMPLETED } });

    expect.assertions(assertions);
  });

  test('should fail when ADD without name or region', async () => {
    expect.assertions(2);

    // add without region
    const res1 = await apolloTestServer.executeOperation(
      { query: ADD_DISTRICT, variables: { district: { name: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res1, 'errorContaining', 'Field "region" of required type "LocaleInput!" was not provided.');

    // add without name
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_DISTRICT, variables: { district: { region: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');
  });
});
