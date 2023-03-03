/**
 * Jest: /resolvers/school
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
  FAKE2,
  FAKE2_LOCALE,
  idsToString,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
  shuffle,
} from '../jest';
import District from '../models/district';
import Level from '../models/level';
import School from '../models/school';
import type { UserDocument } from '../models/user';
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
  let adminServer: ApolloServer | null;
  let adminUser: LeanDocument<UserDocument> | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let url: string;
  let url2: string;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    address: expect.toBeOneOf([null, expectedLocaleFormat]),
    district: expect.toBeOneOf([null, expect.any(String)]),
    location: expect.toBeOneOf([null, { coordinates: [expect.any(String), expect.any(String)] }]),
    phones: expect.arrayContaining([expect.any(String)]),
    emi: expect.toBeOneOf([null, expect.any(Boolean)]),
    band: expect.toBeOneOf([null, expect.any(String)]),
    logoUrl: expect.toBeOneOf([null, expect.any(String)]),
    website: expect.toBeOneOf([null, expect.any(String)]),
    funding: expect.toBeOneOf([null, expect.any(String)]),
    gender: expect.toBeOneOf([null, expect.any(String)]),
    religion: expect.toBeOneOf([null, expect.any(String)]),

    levels: expect.arrayContaining([expect.any(String)]),
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
  afterAll(async () => Promise.all([jestRemoveObject(url), jestRemoveObject(url2), jestTeardown()]));

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_SCHOOLS });
    apolloExpect(res, 'data', { schools: expect.arrayContaining([expectedNormalFormat]) });
  });

  // test('should response an array of data when GET all with arguments', async () => {
  //   expect.assertions(1);

  //   const res = await guestServer!.executeOperation({
  //     query: GET_SCHOOLS,
  //     variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
  //   });
  // apolloExpect(res, 'data', { schools: expect.arrayContaining([expectedNormalFormat]) });
  // });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const schools = await School.find({ deletedAt: { $exists: false } }).lean();
    const res = await guestServer!.executeOperation({ query: GET_SCHOOL, variables: { id: randomId(schools) } });
    apolloExpect(res, 'data', { school: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_SCHOOL });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_SCHOOL, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await normalServer!.executeOperation({
      query: ADD_SCHOOL,
      variables: {
        school: {
          code: FAKE,
          name: FAKE_LOCALE,
          district: FAKE,
          phones: ['+852 88888888'],
          emi: true,
          website: 'http://jest.com',
          levels: [FAKE],
        },
      },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await normalServer!.executeOperation({
      query: ADD_SCHOOL_REMARK,
      variables: { id: FAKE, remark: FAKE },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD, ADD_REMARK, UPDATE & DELETE', async () => {
    expect.assertions(5);

    const [districts, levels] = await Promise.all([
      District.find({ deletedAt: { $exists: false } }).lean(),
      Level.find({ code: { $regex: '[S][1-6]' }, deletedAt: { $exists: false } }),
    ]);

    [url, url2] = await Promise.all([jestPutObject(adminUser!), jestPutObject(adminUser!)]);

    // add a document
    const create = {
      code: FAKE.toUpperCase(),
      name: FAKE_LOCALE,
      phones: ['+852 12345678'],
      ...(prob(0.5) && { emi: prob(0.5) }),
      ...(prob(0.5) && { band: FAKE }),
      ...(prob(0.5) && { logoUrl: url }),
      ...(prob(0.5) && { website: 'http://jest.com' }),
      ...(prob(0.5) && { funding: Object.keys(SCHOOL.FUNDING).sort(shuffle)[0] }),
      ...(prob(0.5) && { gender: Object.keys(SCHOOL.GENDER).sort(shuffle)[0] }),
      ...(prob(0.5) && { religion: FAKE }),
      levels: idsToString(levels.sort(shuffle).slice(0, 3)),
    };
    const createdRes = await adminServer!.executeOperation({
      query: ADD_SCHOOL,
      variables: { school: { ...create, address: FAKE_LOCALE, district: randomId(districts) } },
    });
    apolloExpect(createdRes, 'data', { addSchool: { ...expectedAdminFormat, ...create } });
    const newId = createdRes.data!.addSchool._id.toString();

    // update newly created document (remove logoUrl)
    const update = {
      code: FAKE.toUpperCase(),
      name: FAKE2_LOCALE,
      phones: ['+852 88887777'],
      emi: prob(0.5),
      ...(prob(0.5) && { band: FAKE2 }),
      website: 'http://jest2.com',
      ...(prob(0.5) && { funding: Object.keys(SCHOOL.FUNDING).sort(shuffle)[0] }),
      ...(prob(0.5) && { gender: Object.keys(SCHOOL.GENDER).sort(shuffle)[0] }),
      ...(prob(0.5) && { religion: FAKE2 }),
      levels: idsToString(levels.sort(shuffle).slice(0, 3)),
    };
    const updatedRes = await adminServer!.executeOperation({
      query: UPDATE_SCHOOL,
      variables: {
        id: newId,
        school: { ...update, address: FAKE2_LOCALE, district: randomId(districts), logoUrl: '' },
      },
    });
    apolloExpect(updatedRes, 'data', { updateSchool: { ...expectedAdminFormat, ...update, logoUrl: null } });

    // add logoUrl back
    const updated2Res = await adminServer!.executeOperation({
      query: UPDATE_SCHOOL,
      variables: {
        id: newId,
        school: { ...update, address: FAKE2_LOCALE, district: randomId(districts), logoUrl: url2 },
      },
    });
    apolloExpect(updated2Res, 'data', { updateSchool: { ...expectedAdminFormat, ...update, logoUrl: url2 } });

    // add remark
    const addRemarkRes = await adminServer!.executeOperation({
      query: ADD_SCHOOL_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addSchoolRemark: { ...expectedAdminFormat, ...expectedRemark(adminUser!, FAKE, true) },
    });

    // delete newly created document
    const removedRes = await adminServer!.executeOperation({
      query: REMOVE_SCHOOL,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeSchool: { code: MSG_ENUM.COMPLETED } });
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
      district: randomId(districts),
      emi: prob(0.5),
      band: FAKE,
      website: 'http://jest.com',
      funding: Object.keys(SCHOOL.FUNDING).sort(shuffle)[0],
      gender: Object.keys(SCHOOL.GENDER).sort(shuffle)[0],
      religion: FAKE,
      levels: idsToString(levels.sort(shuffle).slice(0, 3)),
    };

    // add without code
    const { code: _code, ...school1 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res1 = await adminServer!.executeOperation({ query: ADD_SCHOOL, variables: { school: school1 } });
    apolloExpect(res1, 'errorContaining', 'Field "code" of required type "String!" was not provided.');

    // add without name
    const { name: _name, ...school2 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res2 = await adminServer!.executeOperation({ query: ADD_SCHOOL, variables: { school: school2 } });
    apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');

    // add with invalid district
    const res3 = await adminServer!.executeOperation({
      query: ADD_SCHOOL,
      variables: { school: { ...validSchool, district: 'INVALID_ID' } },
    });
    apolloExpect(res3, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);

    // add without phones
    const { phones: _phones, ...school3 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars

    const res4 = await adminServer!.executeOperation({ query: ADD_SCHOOL, variables: { school: school3 } });
    apolloExpect(res4, 'errorContaining', 'Field "phones" of required type "[String!]!" was not provided.');

    // add without emi
    // const { emi: _emi, ...school5 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    // const res5 = await adminServer!.executeOperation({ query: ADD_SCHOOL, variables: { school: school5 } });
    // apolloExpect(res5, 'errorContaining', 'Field "emi" of required type "Boolean!" was not provided.');

    // add without website
    // const { website: _website, ...school6 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    // const res6 = await adminServer!.executeOperation({ query: ADD_SCHOOL, variables: { school: school6 } });
    // apolloExpect(res6, 'errorContaining', 'Field "website" of required type "String!" was not provided.');

    // add without levels
    const { levels: _levels, ...school7 } = validSchool; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res7 = await adminServer!.executeOperation({ query: ADD_SCHOOL, variables: { school: school7 } });
    apolloExpect(res7, 'errorContaining', 'Field "levels" of required type "[String!]!" was not provided.');
  });
});
