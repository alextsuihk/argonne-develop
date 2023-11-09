/**
 * Jest: /resolvers/contact
 *
 */

import { LOCALE } from '@argonne/common';

import type { TokenWithExpireAtResponse } from '../controllers/common';
import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedDateFormat,
  expectedIdFormat,
  FAKE,
  jestSetup,
  jestTeardown,
  prob,
  shuffle,
} from '../jest';
import User, { activeCond } from '../models/user';
import {
  ADD_CONTACT,
  GET_CONTACT,
  GET_CONTACT_TOKEN,
  GET_CONTACTS,
  REMOVE_CONTACT,
  UPDATE_CONTACT,
} from '../queries/contact';

const { MSG_ENUM } = LOCALE;

// Top contact of this test suite:
describe('Contact GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
    name: expect.any(String),
    identifiedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
    availability: expect.any(String),
    tenants: expect.any(Array),
    updatedAt: expectedDateFormat(true),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response a contact list and single contact', async () => {
    expect.assertions(2);

    const user = jest.normalUsers.find(u => u.contacts.length);
    if (!user) throw 'No valid users (with contacts)';

    // getMany()
    const res1 = await apolloTestServer.executeOperation(
      { query: GET_CONTACTS },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res1, 'data', { contacts: expect.arrayContaining([expectedFormat]) });

    // getOne()
    const friendId = user.contacts.sort(shuffle)[0].user.toString();
    const res2 = await apolloTestServer.executeOperation(
      { query: GET_CONTACT, variables: { id: friendId } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res2, 'data', { contact: { ...expectedFormat, _id: friendId } });
  });

  test('should fail when get contact with invalid ID', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_CONTACT, variables: { id: 'WRONG-ID' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when get non-friend contact (cannot be friend himself)', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_CONTACT, variables: { id: jest.normalUser._id.toString() } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'data', { contact: null });
  });

  test('should fail when mutating without AUTH', async () => {
    expect.assertions(2);

    // get contacts
    const res1 = await apolloTestServer.executeOperation(
      { query: GET_CONTACTS },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res1, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    // gen contact token
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_CONTACT, variables: { token: 'DO NOT CARE' } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when trying to make cross-tenant friend', async () => {
    expect.assertions(2);

    const friend = await User.findOne({ tenants: { $nin: jest.normalUser.tenants }, ...activeCond }).lean();
    if (!friend) throw 'There is no potential cross-tenant user';

    // generate contactToken
    const contactTokenRes = await apolloTestServer.executeOperation<{ contactToken: TokenWithExpireAtResponse }>(
      { query: GET_CONTACT_TOKEN, variables: prob(0.5) ? { expiresIn: 5 } : {} },
      { contextValue: apolloContext(friend!) },
    );
    apolloExpect(contactTokenRes, 'data', {
      contactToken: { token: expect.any(String), expireAt: expectedDateFormat(true) },
    });

    // try to add contact
    const token =
      contactTokenRes.body.kind === 'single' ? contactTokenRes.body.singleResult.data!.contactToken.token : null;
    const addContactRes = await apolloTestServer.executeOperation(
      { query: ADD_CONTACT, variables: { token } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(addContactRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should pass when ADD, myContacts, REMOVE, RE-ADD', async () => {
    expect.assertions(6);

    // find an user who not in contacts
    const myContactIds = jest.normalUser.contacts.map(c => c.user);
    const friend = jest.normalUsers
      .slice(1) // skip normalUser himself (idx 0)
      .sort(shuffle)
      .find(({ _id }) => !myContactIds.some(id => id.equals(_id)));

    const friendId = friend!._id.toString();

    // generate contactToken
    const contactTokenRes = await apolloTestServer.executeOperation<{ contactToken: TokenWithExpireAtResponse }>(
      { query: GET_CONTACT_TOKEN, variables: prob(0.5) ? { expiresIn: 5 } : {} },
      { contextValue: apolloContext(friend!) },
    );
    apolloExpect(contactTokenRes, 'data', {
      contactToken: { token: expect.any(String), expireAt: expectedDateFormat(true) },
    });

    // add contact
    const token =
      contactTokenRes.body.kind === 'single' ? contactTokenRes.body.singleResult.data!.contactToken.token : null;
    const addContactRes = await apolloTestServer.executeOperation(
      { query: ADD_CONTACT, variables: { token } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(addContactRes, 'data', {
      addContact: { ...expectedFormat, _id: friendId },
    });

    const contactsRes = await apolloTestServer.executeOperation(
      { query: GET_CONTACTS },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(contactsRes, 'data', {
      contacts: expect.arrayContaining([{ ...expectedFormat, _id: friendId }]),
    });

    // get friend contacts
    const contacts2Res = await apolloTestServer.executeOperation(
      { query: GET_CONTACTS },
      { contextValue: apolloContext(friend!) },
    );
    apolloExpect(contacts2Res, 'data', {
      contacts: expect.arrayContaining([{ ...expectedFormat, _id: jest.normalUser._id.toString() }]),
    });

    // update contact name
    const updateRes = await apolloTestServer.executeOperation(
      { query: UPDATE_CONTACT, variables: { id: friendId, name: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(updateRes, 'data', { updateContact: { ...expectedFormat, _id: friendId, name: FAKE } });

    // delete contact
    const removeRes = await apolloTestServer.executeOperation(
      { query: REMOVE_CONTACT, variables: { id: friendId } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(removeRes, 'data', { removeContact: { code: MSG_ENUM.COMPLETED } });

    // undo the contact relationship
    await Promise.all([
      User.updateOne(jest.normalUser, { $pull: { contacts: { user: friendId } } }),
      User.updateOne({ _id: friendId }, { $pull: { contacts: { user: jest.normalUser._id } } }),
    ]);
  });

  test('should fail when mutate without required fields', async () => {
    expect.assertions(3);

    // create without token
    const res1 = await apolloTestServer.executeOperation(
      { query: ADD_CONTACT },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res1, 'error', 'Variable "$token" of required type "String!" was not provided.');

    // update contact without ID
    const res2 = await apolloTestServer.executeOperation(
      { query: UPDATE_CONTACT, variables: { name: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', 'Variable "$id" of required type "ID!" was not provided.');

    // update contact without name
    const res3 = await apolloTestServer.executeOperation(
      { query: UPDATE_CONTACT, variables: { id: jest.normalUser._id.toString() } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res3, 'error', 'Variable "$name" of required type "String!" was not provided.');
  });
});
