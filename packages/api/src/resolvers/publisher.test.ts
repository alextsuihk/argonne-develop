/**
 * Jest: /resolvers/publisher
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
import Publisher from '../models/publisher';
import type { UserDocument } from '../models/user';
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
  let adminServer: ApolloServer | null;
  let adminUser: UserDocument | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUser: UserDocument | null;
  let url: string | undefined;
  let url2: string | undefined;

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

  beforeAll(async () => {
    ({ adminUser, adminServer, guestServer, normalServer, normalUser } = await jestSetup(['admin', 'guest', 'normal'], {
      apollo: true,
    }));
  });
  afterAll(async () => Promise.all([url && jestRemoveObject(url), url2 && jestRemoveObject(url2), jestTeardown()]));

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_PUBLISHERS });
    apolloExpect(res, 'data', { publishers: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response an array of data when GET all with arguments', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({
      query: GET_PUBLISHERS,
      variables: { updatedAfter: '2000-01-01', updatedBefore: '2100-12-31', skipDeleted: true },
    });
    apolloExpect(res, 'data', { publishers: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const publishers = await Publisher.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(publishers)._id.toString();
    const res = await guestServer!.executeOperation({ query: GET_PUBLISHER, variables: { id } });
    apolloExpect(res, 'data', { publisher: expectedNormalFormat });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_PUBLISHER });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_PUBLISHER, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without ADMIN role', async () => {
    expect.assertions(2);

    // add a document
    const res = await normalServer!.executeOperation({
      query: ADD_PUBLISHER,
      variables: {
        publisher: { admins: [FAKE_ID], name: FAKE_LOCALE, phones: ['+852 12345678'], website: 'http://jest.com' },
      },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

    // add remark
    const res2 = await normalServer!.executeOperation({
      query: ADD_PUBLISHER_REMARK,
      variables: { id: FAKE, remark: FAKE },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  test('should pass when ADD & UPDATE & addAdmin, removeAdmin & DELETE', async () => {
    expect.assertions(5);

    [url, url2] = await Promise.all([jestPutObject(adminUser!._id), jestPutObject(adminUser!._id)]);

    // add a document

    const create = {
      admins: [adminUser!._id.toString()],
      name: FAKE_LOCALE,
      phones: ['+852 12345670'],
      ...(prob(0.5) && { website: 'http://jest.com' }),
      ...(prob(0.5) && { logoUrl: url }),
    };
    const createdRes = await adminServer!.executeOperation({ query: ADD_PUBLISHER, variables: { publisher: create } });
    apolloExpect(createdRes, 'data', { addPublisher: { ...expectedAdminFormat, ...create } });
    const newId = createdRes.data!.addPublisher._id.toString();

    // update newly created document (remove logoUrl)
    const update = {
      admins: [normalUser!._id.toString()],
      name: FAKE2_LOCALE,
      phones: ['+852 87654321'],
      website: 'http://jest2.com',
      logoUrl: '',
    };
    const updatedRes = await adminServer!.executeOperation({
      query: UPDATE_PUBLISHER,
      variables: { id: newId, publisher: update },
    });
    apolloExpect(updatedRes, 'data', { updatePublisher: { ...expectedAdminFormat, ...update, logoUrl: null } }); // logoUrl is removed

    // add logoUrl back
    const updated2Res = await adminServer!.executeOperation({
      query: UPDATE_PUBLISHER,
      variables: { id: newId, publisher: { ...update, logoUrl: url2 } },
    });
    apolloExpect(updated2Res, 'data', { updatePublisher: { ...expectedAdminFormat, ...update, logoUrl: url2 } });

    // add remark
    const addRemarkRes = await adminServer!.executeOperation({
      query: ADD_PUBLISHER_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addPublisherRemark: { ...expectedAdminFormat, ...expectedRemark(adminUser!._id, FAKE, true) },
    });

    // delete newly created document
    const removedRes = await adminServer!.executeOperation({
      query: REMOVE_PUBLISHER,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removePublisher: { code: MSG_ENUM.COMPLETED } });
  });

  test('should fail when ADD without name or phones or website', async () => {
    expect.assertions(3);

    // add without admins
    const res1 = await adminServer!.executeOperation({
      query: ADD_PUBLISHER,
      variables: { publisher: { name: FAKE_LOCALE, phones: ['+852 12345678'], website: 'http://jest.com' } },
    });
    apolloExpect(res1, 'errorContaining', 'Field "admins" of required type "[String!]!" was not provided.');

    // add without name
    const res2 = await adminServer!.executeOperation({
      query: ADD_PUBLISHER,
      variables: { publisher: { admins: [FAKE_ID], phones: ['+852 12345678'], website: 'http://jest.com' } },
    });
    apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');

    // add without phone
    const res3 = await adminServer!.executeOperation({
      query: ADD_PUBLISHER,
      variables: { publisher: { admins: [FAKE_ID], name: FAKE_LOCALE, website: 'http://jest.com' } },
    });
    apolloExpect(res3, 'errorContaining', 'Field "phones" of required type "[String!]!" was not provided.');

    // add without website
    // const res4 = await adminServer!.executeOperation({
    //   query: ADD_PUBLISHER,
    //   variables: { publisher: { admins: [FAKE_ID], name: FAKE_LOCALE, phones: ['+852 12345678'] } },
    // });
    // apolloExpect(res4, 'errorContaining', 'Field "website" of required type "String!" was not provided.');
  });
});
