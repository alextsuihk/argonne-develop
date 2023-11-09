/**
 * Jest: /resolvers/publisher
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
} from '../jest';
import type { PublisherDocument } from '../models/publisher';
import Publisher from '../models/publisher';
import {
  ADD_PUBLISHER,
  ADD_PUBLISHER_REMARK,
  GET_PUBLISHER,
  GET_PUBLISHERS,
  REMOVE_PUBLISHER,
  UPDATE_PUBLISHER,
} from '../queries/publisher';

const { MSG_ENUM } = LOCALE;

// Top publisher of this test suite:
describe('Publisher GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    admins: expect.any(Array),
    phones: expect.any(Array),
    logoUrl: expect.toBeOneOf([null, expect.any(String)]),
    website: expect.toBeOneOf([null, expect.any(String)]),
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
      { query: GET_PUBLISHERS },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { publishers: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await apolloTestServer.executeOperation(
      {
        query: GET_PUBLISHERS,
        variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
      },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { publishers: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const publishers = await Publisher.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(publishers)._id.toString();
    const res = await apolloTestServer.executeOperation(
      { query: GET_PUBLISHER, variables: { id } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { publisher: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_PUBLISHER },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_PUBLISHER, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await apolloTestServer.executeOperation(
      {
        query: ADD_PUBLISHER,
        variables: {
          publisher: { admins: [FAKE_ID], name: FAKE_LOCALE, phones: ['+852 12345678'], website: 'http://jest.com' },
        },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_PUBLISHER_REMARK, variables: { id: FAKE, remark: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD & UPDATE & addAdmin, removeAdmin & DELETE', async () => {
    expect.assertions(5);

    const [url, url2] = await Promise.all([jestPutObject(jest.adminUser._id), jestPutObject(jest.adminUser._id)]);

    // add a document

    const create = {
      admins: [jest.adminUser._id.toString()],
      name: FAKE_LOCALE,
      phones: ['+852 12345670'],
      ...(prob(0.5) && { website: 'http://jest.com' }),
      ...(prob(0.5) && { logoUrl: url }),
    };
    const createdRes = await apolloTestServer.executeOperation<{ addPublisher: PublisherDocument }>(
      { query: ADD_PUBLISHER, variables: { publisher: create } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(createdRes, 'data', { addPublisher: { ...expectedAdminFormat, ...create } });
    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addPublisher._id.toString() : null;

    // update newly created document (remove logoUrl)
    const update = {
      admins: [jest.normalUser._id.toString()],
      name: FAKE2_LOCALE,
      phones: ['+852 87654321'],
      website: 'http://jest2.com',
      logoUrl: '',
    };
    const updatedRes = await apolloTestServer.executeOperation(
      { query: UPDATE_PUBLISHER, variables: { id: newId, publisher: update } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(updatedRes, 'data', { updatePublisher: { ...expectedAdminFormat, ...update, logoUrl: null } }); // logoUrl is removed

    // add logoUrl back
    const updated2Res = await apolloTestServer.executeOperation(
      { query: UPDATE_PUBLISHER, variables: { id: newId, publisher: { ...update, logoUrl: url2 } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(updated2Res, 'data', { updatePublisher: { ...expectedAdminFormat, ...update, logoUrl: url2 } });

    // add remark
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_PUBLISHER_REMARK, variables: { id: newId, remark: FAKE } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(addRemarkRes, 'data', {
      addPublisherRemark: { ...expectedAdminFormat, ...expectedRemark(jest.adminUser._id, FAKE, true) },
    });

    // delete newly created document
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_PUBLISHER, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(removedRes, 'data', { removePublisher: { code: MSG_ENUM.COMPLETED } });

    // clean up
    await Promise.all([jestRemoveObject(url), jestRemoveObject(url2)]);
  });

  test('should fail when ADD without name or phones or website', async () => {
    expect.assertions(3);

    // add without admins
    const res1 = await apolloTestServer.executeOperation(
      {
        query: ADD_PUBLISHER,
        variables: { publisher: { name: FAKE_LOCALE, phones: ['+852 12345678'], website: 'http://jest.com' } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res1, 'errorContaining', 'Field "admins" of required type "[String!]!" was not provided.');

    // add without name
    const res2 = await apolloTestServer.executeOperation(
      {
        query: ADD_PUBLISHER,
        variables: { publisher: { admins: [FAKE_ID], phones: ['+852 12345678'], website: 'http://jest.com' } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');

    // add without phone
    const res3 = await apolloTestServer.executeOperation(
      {
        query: ADD_PUBLISHER,
        variables: { publisher: { admins: [FAKE_ID], name: FAKE_LOCALE, website: 'http://jest.com' } },
      },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res3, 'errorContaining', 'Field "phones" of required type "[String!]!" was not provided.');

    // add without website
    // const res4 = await adminServer!.executeOperation({
    //   query: ADD_PUBLISHER,
    //   variables: { publisher: { admins: [FAKE_ID], name: FAKE_LOCALE, phones: ['+852 12345678'] } },
    // });
    // apolloExpect(res4, 'errorContaining', 'Field "website" of required type "String!" was not provided.');
  });
});
