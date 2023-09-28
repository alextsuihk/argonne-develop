/**
 * Jest: /resolvers/contact
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
  expectedDateFormat,
  expectedIdFormat,
  FAKE,
  jestSetup,
  jestTeardown,
  prob,
  shuffle,
  testServer,
} from '../jest';
import type { Id, UserDocument } from '../models/user';
import User from '../models/user';
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
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUser: (UserDocument & Id) | null;
  let normalUsers: (UserDocument & Id)[] | null;

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

  beforeAll(async () => {
    ({ normalUsers, guestServer, normalServer, normalUser } = await jestSetup(['guest', 'normal'], {
      apollo: true,
    }));
  });
  afterAll(jestTeardown);

  test('should response a contact list and single contact', async () => {
    expect.assertions(2);

    const user = normalUsers!.find(u => u.contacts.length);
    if (!user) throw 'No valid users (with contacts)';

    const userServer = testServer(user);

    // getMany()
    const res1 = await userServer.executeOperation({ query: GET_CONTACTS });
    apolloExpect(res1, 'data', { contacts: expect.arrayContaining([expectedFormat]) });

    // getOne()
    const friendId = user.contacts.sort(shuffle)[0].user.toString();
    const res2 = await userServer.executeOperation({ query: GET_CONTACT, variables: { id: friendId } });
    apolloExpect(res2, 'data', { contact: { ...expectedFormat, _id: friendId } });
  });

  test('should fail when get contact with invalid ID', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_CONTACT, variables: { id: 'WRONG-ID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when get non-friend contact (cannot be friend himself)', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({
      query: GET_CONTACT,
      variables: { id: normalUser!._id.toString() },
    });
    apolloExpect(res, 'data', { contact: null });
  });

  test('should fail when mutating without AUTH', async () => {
    expect.assertions(2);

    // get contacts
    const res1 = await guestServer!.executeOperation({ query: GET_CONTACTS });
    apolloExpect(res1, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    // gen contact token
    const res2 = await guestServer!.executeOperation({
      query: ADD_CONTACT,
      variables: { token: 'DO NOT CARE' },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should pass when ADD, myContacts, REMOVE, RE-ADD', async () => {
    expect.assertions(6);

    // find an user who not in contacts
    const myContactIds = normalUser!.contacts.map(c => c.user);
    const friend = normalUsers!
      .slice(1) // skip normalUser himself (idx 0)
      .sort(shuffle)
      .find(({ _id }) => !myContactIds.some(id => id.equals(_id)));

    const friendId = friend!._id.toString();
    const friendServer = testServer(friend);

    // generate contactToken
    const contactTokenRes = await friendServer.executeOperation({
      query: GET_CONTACT_TOKEN,
      variables: prob(0.5) ? { expiresIn: 5 } : {},
    });
    apolloExpect(contactTokenRes, 'data', {
      contactToken: { token: expect.any(String), expireAt: expectedDateFormat(true) },
    });

    // add contact
    const addContactRes = await normalServer!.executeOperation({
      query: ADD_CONTACT,
      variables: { token: contactTokenRes.data!.contactToken.token },
    });
    apolloExpect(addContactRes, 'data', {
      addContact: { ...expectedFormat, _id: friendId },
    });

    const contactsRes = await normalServer!.executeOperation({ query: GET_CONTACTS });
    apolloExpect(contactsRes, 'data', {
      contacts: expect.arrayContaining([{ ...expectedFormat, _id: friendId }]),
    });

    // get friend contacts
    const contacts2Res = await friendServer.executeOperation({ query: GET_CONTACTS });
    apolloExpect(contacts2Res, 'data', {
      contacts: expect.arrayContaining([{ ...expectedFormat, _id: normalUser!._id.toString() }]),
    });

    // update contact name
    const updateRes = await normalServer!.executeOperation({
      query: UPDATE_CONTACT,
      variables: { id: friendId, name: FAKE },
    });
    apolloExpect(updateRes, 'data', { updateContact: { ...expectedFormat, _id: friendId, name: FAKE } });

    // delete contact
    const removeRes = await normalServer!.executeOperation({ query: REMOVE_CONTACT, variables: { id: friendId } });
    apolloExpect(removeRes, 'data', { removeContact: { code: MSG_ENUM.COMPLETED } });

    // undo the contact relationship
    await Promise.all([
      User.updateOne(normalUser!, { $pull: { contacts: { user: friendId } } }),
      User.updateOne({ _id: friendId }, { $pull: { contacts: { user: normalUser!._id } } }),
    ]);
  });

  test('should fail when mutate without required fields', async () => {
    expect.assertions(3);

    // create without token
    const res1 = await normalServer!.executeOperation({ query: ADD_CONTACT });
    apolloExpect(res1, 'error', 'Variable "$token" of required type "String!" was not provided.');

    // update contact without ID
    const res2 = await normalServer!.executeOperation({ query: UPDATE_CONTACT, variables: { name: FAKE } });
    apolloExpect(res2, 'error', 'Variable "$id" of required type "ID!" was not provided.');

    // update contact without name
    const res3 = await normalServer!.executeOperation({
      query: UPDATE_CONTACT,
      variables: { id: normalUser!._id.toString() },
    });
    apolloExpect(res3, 'error', 'Variable "$name" of required type "String!" was not provided.');
  });
});
