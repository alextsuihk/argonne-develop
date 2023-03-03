/**
 * Jest: /resolvers/contact
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument, Types } from 'mongoose';

import {
  apolloExpect,
  ApolloServer,
  expectedIdFormat,
  FAKE,
  idsToString,
  jestSetup,
  jestTeardown,
  shuffle,
  testServer,
} from '../jest';
import type { UserDocument } from '../models/user';
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
  let normalUser: LeanDocument<UserDocument> | null;
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let tenantId: string | null;

  const expectedFormat = {
    _id: expectedIdFormat,
    avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
    name: expect.any(String),
    identifiedAt: expect.toBeOneOf([null, expect.any(Number)]),
    status: expect.any(String),
    tenants: expect.arrayContaining([expect.any(String)]),
  };

  beforeAll(async () => {
    ({ normalUsers, guestServer, normalServer, normalUser, tenantId } = await jestSetup(['guest', 'normal'], {
      apollo: true,
    }));
  });
  afterAll(jestTeardown);

  test('should response a contact list from req.user', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_CONTACTS });
    apolloExpect(res, 'data', { contacts: expect.arrayContaining([expectedFormat]) });
  });

  test('should response a single contact from req.user', async () => {
    expect.assertions(1);
    const [randomContactId] = normalUser!.contacts.map(c => c.user.toString()).sort(shuffle);
    const res = await normalServer!.executeOperation({ query: GET_CONTACT, variables: { id: randomContactId! } });
    apolloExpect(res, 'data', { contact: expectedFormat });
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

    // remove contact relationship if exists
    const cleanUp = async (userId: string | Types.ObjectId, user2Id: string | Types.ObjectId) =>
      Promise.all([
        User.findByIdAndUpdate(userId, { $pull: { contacts: { user: user2Id } } }),
        User.findByIdAndUpdate(user2Id, { $pull: { contacts: { user: userId } } }),
      ]);

    const [friend] = normalUsers!.filter(
      user => idsToString(user.tenants).includes(tenantId!) && user._id.toString() !== normalUser!._id.toString(),
    );
    const friendServer = testServer(friend);
    const friendId = friend._id.toString();

    await cleanUp(normalUser!._id, friendId);

    // generate contactToken
    const contactTokenRes = await friendServer.executeOperation({ query: GET_CONTACT_TOKEN });
    apolloExpect(contactTokenRes, 'data', { contactToken: expect.any(String) });

    // add contact
    const addContactRes = await normalServer!.executeOperation({
      query: ADD_CONTACT,
      variables: { token: contactTokenRes.data!.contactToken },
    });
    apolloExpect(addContactRes, 'data', {
      addContact: { ...expectedFormat, _id: friendId, name: friend.name },
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

    await cleanUp(normalUser!._id, friendId);
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
