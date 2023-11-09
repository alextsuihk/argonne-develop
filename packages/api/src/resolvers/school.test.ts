/**
 * Jest: /resolvers/school
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
  FAKE_ID,
  FAKE_LOCALE,
  FAKE2_LOCALE,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomItems,
} from '../jest';
import District from '../models/district';
import Level from '../models/level';
import type { SchoolDocument } from '../models/school';
import School from '../models/school';
import {
  ADD_SCHOOL,
  ADD_SCHOOL_REMARK,
  GET_SCHOOL,
  GET_SCHOOLS,
  REMOVE_SCHOOL,
  UPDATE_SCHOOL,
} from '../queries/school';

const { MSG_ENUM } = LOCALE;
const { SCHOOL } = LOCALE.DB_ENUM;

// Top level of this test suite:
describe('School GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    address: expect.toBeOneOf([null, expectedLocaleFormat]),
    district: expectedIdFormat,
    location: expect.toBeOneOf([null, { coordinates: [expect.any(String), expect.any(String)] }]),
    // phones: expect.arrayContaining([expect.any(String)]),
    phones: expect.any(Array),

    emi: expect.toBeOneOf([null, expect.any(Boolean)]),
    band: expect.toBeOneOf(Object.keys(SCHOOL.BAND)),
    logoUrl: expect.toBeOneOf([null, expect.any(String)]),
    website: expect.toBeOneOf([null, expect.any(String)]),
    funding: expect.toBeOneOf(Object.keys(SCHOOL.FUNDING)),
    gender: expect.toBeOneOf(Object.keys(SCHOOL.GENDER)),
    religion: expect.toBeOneOf(Object.keys(SCHOOL.RELIGION)),

    // levels: expect.arrayContaining([expectedIdFormat]),
    levels: expect.any(Array), // could be empty for universities
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

    const res = await apolloTestServer.executeOperation({ query: GET_SCHOOLS }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'data', { schools: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      { query: GET_SCHOOLS, variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { schools: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const schools = await School.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(schools)._id.toString();
    const res = await apolloTestServer.executeOperation(
      { query: GET_SCHOOL, variables: { id } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { school: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation({ query: GET_SCHOOL }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_SCHOOL, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await apolloTestServer.executeOperation(
      {
        query: ADD_SCHOOL,
        variables: {
          school: {
            code: FAKE,
            name: FAKE_LOCALE,
            district: FAKE_ID,
            phones: ['+852 88888888'],
            emi: true,
            website: 'http://jest.com',
            levels: [FAKE],
          },
        },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_SCHOOL_REMARK, variables: { id: FAKE, remark: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD, ADD_REMARK, UPDATE & DELETE', async () => {
    expect.assertions(5);

    const [districts, levels] = await Promise.all([
      District.find({ deletedAt: { $exists: false } }).lean(),
      Level.find({ code: { $regex: '[S][1-6]' }, deletedAt: { $exists: false } }),
    ]);

    const [url, url2] = await Promise.all([jestPutObject(jest.adminUser._id), jestPutObject(jest.adminUser._id)]);

    const fake = (type: 'create' | 'update') => ({
      code: FAKE.toUpperCase(),
      name: type === 'create' ? FAKE_LOCALE : FAKE2_LOCALE,
      address: type === 'create' ? FAKE_LOCALE : FAKE2_LOCALE,
      district: randomItem(districts)._id.toString(),
      phones: type === 'create' ? ['+852 12345678'] : ['+852 98765432', '+852 88887777'],
      ...(prob(0.5) && { emi: prob(0.5) }),
      band: randomItem(Object.keys(SCHOOL.BAND)),
      logoUrl: type === 'create' ? url : url2,
      website: type === 'create' ? 'http://jest.com' : 'http://jest2.com',
      funding: randomItem(Object.keys(SCHOOL.FUNDING)),
      gender: randomItem(Object.keys(SCHOOL.GENDER)),
      religion: randomItem(Object.keys(SCHOOL.RELIGION)),
      levels: randomItems(levels, 3)
        .map(level => level._id.toString())
        .sort(), // sort in alphanumeric order
    });

    // add a document
    const create = fake('create');
    const createdRes = await apolloTestServer.executeOperation<{ addSchool: SchoolDocument }>(
      { query: ADD_SCHOOL, variables: { school: create } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(createdRes, 'data', { addSchool: { ...expectedAdminFormat, ...create } });
    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addSchool._id.toString() : null;

    // update newly created document (remove logoUrl & website)
    const update = fake('update');
    const updatedRes = await apolloTestServer.executeOperation(
      {
        query: UPDATE_SCHOOL,
        variables: { id: newId, school: { ...update, logoUrl: '', website: '' } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(updatedRes, 'data', {
      updateSchool: { ...expectedAdminFormat, ...update, logoUrl: null, website: null },
    });

    // add logoUrl back
    const updated2Res = await apolloTestServer.executeOperation(
      { query: UPDATE_SCHOOL, variables: { id: newId, school: update } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(updated2Res, 'data', { updateSchool: { ...expectedAdminFormat, ...update } });

    // add remark
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_SCHOOL_REMARK, variables: { id: newId, remark: FAKE } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(addRemarkRes, 'data', {
      addSchoolRemark: { ...expectedAdminFormat, ...expectedRemark(jest.adminUser._id, FAKE, true) },
    });

    // delete newly created document
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_SCHOOL, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(removedRes, 'data', { removeSchool: { code: MSG_ENUM.COMPLETED } });

    // clean up
    await Promise.all([jestRemoveObject(url), jestRemoveObject(url2)]);
  });

  test('should fail when ADD without required fields', async () => {
    expect.assertions(5);

    const [districts, levels] = await Promise.all([
      District.find({ deletedAt: { $exists: false } }).lean(),
      Level.find({ code: { $regex: '[S][1-6]' }, deletedAt: { $exists: false } }),
    ]);

    const validSchool = {
      code: FAKE,
      name: FAKE_LOCALE,
      address: FAKE_LOCALE,
      phones: ['+852 12345678'],
      district: randomItem(districts)._id.toString(),
      emi: prob(0.5),
      band: FAKE,
      website: 'http://jest.com',
      funding: randomItem(Object.keys(SCHOOL.FUNDING)),
      gender: randomItem(Object.keys(SCHOOL.GENDER)),
      religion: FAKE,
      levels: randomItems(levels, 3)
        .map(level => level._id.toString())
        .sort(), // sort in alphanumeric order
    };

    // add without code
    const { code: _code, ...school1 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res1 = await apolloTestServer.executeOperation(
      { query: ADD_SCHOOL, variables: { school: school1 } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res1, 'errorContaining', 'Field "code" of required type "String!" was not provided.');

    // add without name
    const { name: _name, ...school2 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_SCHOOL, variables: { school: school2 } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');

    // add with invalid district
    const res3 = await apolloTestServer.executeOperation(
      { query: ADD_SCHOOL, variables: { school: { ...validSchool, district: 'INVALID_ID' } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res3, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // add without phones
    const { phones: _phones, ...school3 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars

    const res4 = await apolloTestServer.executeOperation(
      { query: ADD_SCHOOL, variables: { school: school3 } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res4, 'errorContaining', 'Field "phones" of required type "[String!]!" was not provided.');

    // // add without emi
    // const { emi: _emi, ...school5 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    // const res5 = await apolloTestServer.executeOperation(
    //   { query: ADD_SCHOOL, variables: { school: school5 } },
    //   { contextValue: apolloContext(jest.adminUser) },
    // );
    // apolloExpect(res5, 'errorContaining', 'Field "emi" of required type "Boolean!" was not provided.');

    // // add without website
    // const { website: _website, ...school6 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    // const res6 = await apolloTestServer.executeOperation(
    //   { query: ADD_SCHOOL, variables: { school: school6 } },
    //   { contextValue: apolloContext(jest.adminUser) },
    // );
    // apolloExpect(res6, 'errorContaining', 'Field "website" of required type "String!" was not provided.');

    // add without levels
    const { levels: _levels, ...school7 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res7 = await apolloTestServer.executeOperation(
      { query: ADD_SCHOOL, variables: { school: school7 } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res7, 'errorContaining', 'Field "levels" of required type "[String!]!" was not provided.');
  });
});
