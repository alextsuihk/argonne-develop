/**
 * JEST Test: /api/contacts routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { expectedDateFormat, expectedIdFormat, FAKE, jestSetup, jestTeardown, prob, shuffle } from '../../jest';
import type { UserDocument } from '../../models/user';
import User, { activeCond } from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;

const { getMany } = commonTest;
const route = 'contacts';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    // avatarUrl:  expect.any(String), // could be undefined
    name: expect.any(String),
    availability: expect.any(String),
    tenants: expect.any(Array),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () => {
    const user = jest.normalUsers.find(u => u.contacts.length);
    if (!user) throw 'No valid users (with contacts)';

    await getMany(route, { 'Jest-User': user._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should fail when trying to make cross-tenant friend', async () => {
    expect.assertions(2 * 3);

    const friend = await User.findOne({ tenants: { $nin: jest.normalUser.tenants }, ...activeCond }).lean();
    if (!friend) throw 'There is no potential cross-tenant user';

    // create contactToken
    const tokenRes = await request(app)
      .post('/api/contacts/createToken')
      .send(prob(0.5) ? { expiresIn: 5 } : {})
      .set({ 'Jest-User': jest.normalUser._id });
    expect(tokenRes.body).toEqual({ data: { token: expect.any(String), expireAt: expectedDateFormat() } });
    expect(tokenRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(tokenRes.status).toBe(200);
    const { token } = tokenRes.body.data;

    // try to bind
    const addRes = await request(app).post(`/api/contacts`).send({ token }).set({ 'Jest-User': friend._id });
    expect(addRes.body).toEqual({ type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(422);
  });

  test('should pass when generate token, add contact, and then remove', async () => {
    expect.assertions(18);

    const userId = jest.normalUser._id.toString();

    const myContactIds = jest.normalUser.contacts.map(c => c.user);
    const friend = jest.normalUsers
      .slice(1) // skip normalUser himself (idx 0)
      .sort(shuffle)
      .find(({ _id }) => !myContactIds.some(id => id.equals(_id)));
    const friendId = friend!._id.toString();

    // create contactToken
    const tokenRes = await request(app)
      .post('/api/contacts/createToken')
      .send(prob(0.5) ? { expiresIn: 5 } : {})
      .set({ 'Jest-User': friendId });
    expect(tokenRes.body).toEqual({ data: { token: expect.any(String), expireAt: expectedDateFormat() } });
    expect(tokenRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(tokenRes.status).toBe(200);
    const { token } = tokenRes.body.data;

    // add contact
    const addRes = await request(app).post(`/api/contacts`).send({ token }).set({ 'Jest-User': userId });
    expect(addRes.body).toEqual({ data: expect.objectContaining({ ...expectedMinFormat, _id: friendId }) });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(201);

    // get my contacts (as normalUser) [pagination might not show friendId on first page]
    const contactRes = await request(app).get(`/api/contacts/${friendId}`).set({ 'Jest-User': userId });

    expect(contactRes.body).toEqual({
      data: expect.objectContaining({ ...expectedMinFormat, _id: friendId }),
    });
    expect(contactRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(contactRes.status).toBe(200);

    // get my contacts (as friend)
    const friendRes = await request(app).get(`/api/contacts/${userId}`).set({ 'Jest-User': friendId });
    expect(friendRes.body).toEqual({
      data: expect.objectContaining({ ...expectedMinFormat, _id: userId }),
    });

    expect(friendRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(friendRes.status).toBe(200);

    // update friend name
    const updateRes = await request(app)
      .patch(`/api/contacts/${friendId}`)
      .send({ name: FAKE })
      .set({ 'Jest-User': userId });
    expect(updateRes.body).toEqual({
      data: expect.objectContaining({ ...expectedMinFormat, _id: friendId, name: FAKE }),
    });
    expect(updateRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(updateRes.status).toBe(200);

    // delete contact (as normalUser)
    const removeRes = await request(app).delete(`/api/contacts/${friendId}`).set({ 'Jest-User': userId });
    expect(removeRes.body).toEqual({ data: { code: MSG_ENUM.COMPLETED } });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);

    // undo the contact relationship
    await Promise.all([
      User.updateOne({ _id: userId }, { $pull: { contacts: { user: friendId } } }),
      User.updateOne({ _id: friendId }, { $pull: { contacts: { user: userId } } }),
    ]);
  });
});
