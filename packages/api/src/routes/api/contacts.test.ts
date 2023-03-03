//! try to make friends cross tenants

/**
 * JEST Test: /api/contacts routes
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument, Types } from 'mongoose';
import request from 'supertest';

import app from '../../app';
import { expectedIdFormat, FAKE, jestSetup, jestTeardown } from '../../jest';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;

const { getMany } = commonTest;
const route = 'contacts';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let normalUser: LeanDocument<UserDocument> | null;

  const expectedMinFormat = {
    _id: expectedIdFormat,
    avatarUrl: expect.toBeOneOf([null, expect.any(String)]),
    name: expect.any(String),
    status: expect.any(String),
    tenants: expect.arrayContaining([expect.any(String)]),
  };

  beforeAll(async () => {
    ({ normalUser, normalUsers } = await jestSetup(['normal']));
  });

  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, { 'Jest-User': normalUser!._id }, expectedMinFormat, {
      skipMeta: true,
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should pass when generate token, add contact, and then remove', async () => {
    // normalUser is auth-user, activeUser is the friend
    expect.assertions(18);

    // remove contact relationship if exists
    const cleanUp = async (user1Id: string | Types.ObjectId, user2Id: string | Types.ObjectId) =>
      Promise.all([
        User.findByIdAndUpdate(user1Id, { $pull: { contacts: { user: user2Id } } }),
        User.findByIdAndUpdate(user2Id, { $pull: { contacts: { user: user1Id } } }),
      ]);

    const friendId = normalUsers!
      .find(user => user.contacts.map(c => c.user.toString()).includes(normalUser!._id.toString()))!
      ._id.toString();
    await cleanUp(normalUser!._id, friendId); // this is unnecessary

    // generate contactToken
    const tokenRes = await request(app).post('/api/contacts/token').set({ 'Jest-User': friendId });
    expect(tokenRes.body).toEqual({ data: expect.any(String) });
    expect(tokenRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(tokenRes.status).toBe(200);
    const token = tokenRes.body.data;

    // add contact
    const addRes = await request(app).post(`/api/contacts`).send({ token }).set({ 'Jest-User': normalUser!._id });
    expect(addRes.body).toEqual({ data: expect.objectContaining(expectedMinFormat) });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(201);

    // get my contacts (as JestUser)
    const jestRes = await request(app).get('/api/contacts').set({ 'Jest-User': normalUser!._id });
    expect(jestRes.body).toEqual({
      data: expect.arrayContaining([expect.objectContaining({ ...expectedMinFormat, _id: friendId })]),
    });
    expect(jestRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(jestRes.status).toBe(200);

    // get my contacts (as friend)
    const friendRes = await request(app).get('/api/contacts').set({ 'Jest-User': friendId });
    expect(friendRes.body).toEqual({
      data: expect.arrayContaining([
        expect.objectContaining({ ...expectedMinFormat, _id: normalUser!._id.toString() }),
      ]),
    });

    expect(friendRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(friendRes.status).toBe(200);

    // update friend name
    const updateRes = await request(app)
      .patch(`/api/contacts/${friendId}`)
      .send({ name: FAKE })
      .set({ 'Jest-User': normalUser!._id });
    expect(updateRes.body).toEqual({
      data: expect.objectContaining({ ...expectedMinFormat, _id: friendId, name: FAKE }),
    });
    expect(updateRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(updateRes.status).toBe(200);

    // delete contact (as JestUser)
    const removeRes = await request(app).delete(`/api/contacts/${friendId}`).set({ 'Jest-User': normalUser!._id });
    expect(removeRes.body).toEqual({ data: { code: MSG_ENUM.COMPLETED } });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);

    await cleanUp(normalUser!._id, friendId);
  });
});
