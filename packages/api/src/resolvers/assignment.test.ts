/**
 * Jest: /resolvers/assignment
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
import District from '../models/district';
import type { UserDocument } from '../models/user';
import {
  ADD_ASSIGNMENT,
  GET_ASSIGNMENT,
  GET_ASSIGNMENTS,
  GRADE_ASSIGNMENT,
  REMOVE_ASSIGNMENT,
  UPDATE_ASSIGNMENT,
} from '../queries/assignment';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('District GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: UserDocument | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    classroom: expectedIdFormat,
    title: expect.toBeOneOf([null, expect.any(String)]),
    deadline: expectedDateFormat(true),

    bookAssignments: expect.any(Array), // could be empty array
    manualAssignments: expect.any(Array),
    maxScores: expect.any(Number),

    job: expect.toBeOneOf([null, expectedIdFormat]),
    homeworks: expect.arrayContaining([
      {
        _id: expectedIdFormat,
        flags: expect.any(Array),
        users: expectedIdFormat,
        assignmentIdx: expect.any(Number),
        dynParamIdx: expect.toBeOneOf([null, expect.any(Number)]),
        answer: expect.toBeOneOf([null, expect.any(Number)]),
        answeredAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
        viewedExamples: expect.any(Array),
        scores: expect.any(Array),
        questions: expect.any(Array), // could be empty array
      },
    ]),

    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),

    contentsToken: expect.any(String),
  };

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer } = await jestSetup(['admin', 'guest', 'normal'], {
      apollo: true,
    }));
  });
  afterAll(jestTeardown);

  test.skip('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_DISTRICTS });
    apolloExpect(res, 'data', { districts: expect.arrayContaining([expectedNormalFormat]) });
  });

  test.skip('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const districts = await District.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(districts)._id.toString();
    const res = await guestServer!.executeOperation({ query: GET_DISTRICT, variables: { id } });
    apolloExpect(res, 'data', { district: expectedNormalFormat });
  });

  test.skip('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_DISTRICT });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test.skip('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_DISTRICT, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test.skip('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await normalServer!.executeOperation({
      query: ADD_DISTRICT,
      variables: { district: { name: FAKE_LOCALE, region: FAKE_LOCALE } },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await normalServer!.executeOperation({
      query: ADD_DISTRICT_REMARK,
      variables: { id: FAKE, remark: FAKE },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test.skip('should pass when ADD, ADD_REMARK, & UPDATE & DELETE', async () => {
    expect.assertions(4);

    // add a document
    const createdRes = await adminServer!.executeOperation({
      query: ADD_DISTRICT,
      variables: { district: { name: FAKE_LOCALE, region: FAKE2_LOCALE } },
    });
    apolloExpect(createdRes, 'data', { addDistrict: expectedAdminFormat });
    const newId: string = createdRes.data!.addDistrict._id;

    // add remark
    const addRemarkRes = await adminServer!.executeOperation({
      query: ADD_DISTRICT_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addDistrictRemark: { ...expectedAdminFormat, ...expectedRemark(adminUser!._id, FAKE, true) },
    });

    // update newly created document
    const updatedRes = await adminServer!.executeOperation({
      query: UPDATE_DISTRICT,
      variables: { id: newId, district: { name: FAKE2_LOCALE, region: FAKE_LOCALE } },
    });
    apolloExpect(updatedRes, 'data', { updateDistrict: expectedAdminFormat });

    // delete newly created document
    const removedRes = await adminServer!.executeOperation({
      query: REMOVE_DISTRICT,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeDistrict: { code: MSG_ENUM.COMPLETED } });
  });

  test.skip('should fail when ADD without name or region', async () => {
    expect.assertions(2);

    // add without region
    const res1 = await adminServer!.executeOperation({
      query: ADD_DISTRICT,
      variables: { district: { name: FAKE_LOCALE } },
    });
    apolloExpect(res1, 'errorContaining', 'Field "region" of required type "LocaleInput!" was not provided.');

    // add without name
    const res2 = await adminServer!.executeOperation({
      query: ADD_DISTRICT,
      variables: { district: { region: FAKE_LOCALE } },
    });
    apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');
  });
});
