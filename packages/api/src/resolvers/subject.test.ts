/**
 * Jest: /resolvers/subject
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
  randomItems,
} from '../jest';
import Level from '../models/level';
import Subject from '../models/subject';
import type { UserDocument } from '../models/user';
import {
  ADD_SUBJECT,
  ADD_SUBJECT_REMARK,
  GET_SUBJECT,
  GET_SUBJECTS,
  REMOVE_SUBJECT,
  UPDATE_SUBJECT,
} from '../queries/subject';

const { MSG_ENUM } = LOCALE;

// Top subject of this test suite:
describe('Subject GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: UserDocument | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    levels: expect.arrayContaining([expectedIdFormat]),
    name: expectedLocaleFormat,
    remarks: null,
    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
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

    const res = await guestServer!.executeOperation({ query: GET_SUBJECTS });
    apolloExpect(res, 'data', { subjects: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: GET_SUBJECTS,
      variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
    });
    apolloExpect(res, 'data', { subjects: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const subjects = await Subject.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(subjects)._id.toString();

    const res = await guestServer!.executeOperation({ query: GET_SUBJECT, variables: { id } });
    apolloExpect(res, 'data', { subject: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_SUBJECT });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_SUBJECT, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await normalServer!.executeOperation({
      query: ADD_SUBJECT,
      variables: { subject: { name: FAKE_LOCALE, levels: [FAKE] } },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await normalServer!.executeOperation({
      query: ADD_SUBJECT_REMARK,
      variables: { id: FAKE, remark: FAKE },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD, ADD_REMARK & UPDATE & DELETE', async () => {
    expect.assertions(4);

    const levels = await Level.find({ deletedAt: { $exists: false } }).lean();
    const levelIds = levels.map(level => level._id.toString());

    // add a document
    const create = { name: FAKE_LOCALE, levels: randomItems(levelIds, 3).sort() };
    const createdRes = await adminServer!.executeOperation({ query: ADD_SUBJECT, variables: { subject: create } });
    apolloExpect(createdRes, 'data', { addSubject: { ...expectedAdminFormat, ...create } });
    const newId: string = createdRes.data!.addSubject._id;

    // add remark
    const addRemarkRes = await adminServer!.executeOperation({
      query: ADD_SUBJECT_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addSubjectRemark: { ...expectedAdminFormat, ...expectedRemark(adminUser!._id, FAKE, true) },
    });

    // update newly created document
    const update = { name: FAKE2_LOCALE, levels: randomItems(levelIds, 3).sort() };
    const updatedRes = await adminServer!.executeOperation({
      query: UPDATE_SUBJECT,
      variables: { id: newId, subject: update },
    });
    apolloExpect(updatedRes, 'data', { updateSubject: { ...expectedAdminFormat, ...update } });

    // delete newly created document
    const removedRes = await adminServer!.executeOperation({
      query: REMOVE_SUBJECT,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeSubject: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD without name', async () => {
    expect.assertions(2);

    // add without name
    const res1 = await adminServer!.executeOperation({
      query: ADD_SUBJECT,
      variables: { subject: { levels: [FAKE, FAKE] } },
    });
    apolloExpect(res1, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');

    // add without level
    const res2 = await adminServer!.executeOperation({
      query: ADD_SUBJECT,
      variables: { subject: { name: FAKE_LOCALE } },
    });
    apolloExpect(res2, 'errorContaining', 'Field "levels" of required type "[String!]!" was not provided.');
  });
});
