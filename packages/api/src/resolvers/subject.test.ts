/**
 * Jest: /resolvers/subject
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';

import {
  FAKE,
  FAKE2_LOCALE,
  FAKE_LOCALE,
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedDateFormat,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomItems,
} from '../jest';
import Level from '../models/level';
import Subject, { SubjectDocument } from '../models/subject';
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
  let jest: Awaited<ReturnType<typeof jestSetup>>;

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

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation({ query: GET_SUBJECTS }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'data', { subjects: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      {
        query: GET_SUBJECTS,
        variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
      },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { subjects: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const subjects = await Subject.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(subjects)._id.toString();

    const res = await apolloTestServer.executeOperation(
      { query: GET_SUBJECT, variables: { id } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { subject: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation({ query: GET_SUBJECT }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_SUBJECT, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await apolloTestServer.executeOperation(
      { query: ADD_SUBJECT, variables: { subject: { name: FAKE_LOCALE, levels: [FAKE] } } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_SUBJECT_REMARK, variables: { id: FAKE, remark: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD, ADD_REMARK & UPDATE & DELETE', async () => {
    expect.assertions(4);

    const levels = await Level.find({ deletedAt: { $exists: false } }).lean();
    const levelIds = levels.map(level => level._id.toString());

    // add a document
    const create = { name: FAKE_LOCALE, levels: randomItems(levelIds, 3).sort() };
    const createdRes = await apolloTestServer.executeOperation<{ addSubject: SubjectDocument }>(
      { query: ADD_SUBJECT, variables: { subject: create } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(createdRes, 'data', { addSubject: { ...expectedAdminFormat, ...create } });
    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addSubject._id.toString() : null;

    // add remark
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_SUBJECT_REMARK, variables: { id: newId, remark: FAKE } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(addRemarkRes, 'data', {
      addSubjectRemark: { ...expectedAdminFormat, ...expectedRemark(jest.adminUser._id, FAKE, true) },
    });

    // update newly created document
    const update = { name: FAKE2_LOCALE, levels: randomItems(levelIds, 3).sort() };
    const updatedRes = await apolloTestServer.executeOperation(
      { query: UPDATE_SUBJECT, variables: { id: newId, subject: update } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(updatedRes, 'data', { updateSubject: { ...expectedAdminFormat, ...update } });

    // delete newly created document
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_SUBJECT, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(removedRes, 'data', { removeSubject: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD without name', async () => {
    expect.assertions(2);

    // add without name
    const res1 = await apolloTestServer.executeOperation(
      { query: ADD_SUBJECT, variables: { subject: { levels: [FAKE, FAKE] } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res1, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');

    // add without level
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_SUBJECT, variables: { subject: { name: FAKE_LOCALE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res2, 'errorContaining', 'Field "levels" of required type "[String!]!" was not provided.');
  });
});
