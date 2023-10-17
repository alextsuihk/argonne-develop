/**
 * JEST Test: /api/roles routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { jestSetup, jestTeardown } from '../../jest';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { getByIdNonExisting } = commonTest;

// Top level of this test suite:
describe('Role API Routes', () => {
  let adminUser: UserDocument | null;
  let normalUser: UserDocument | null;

  beforeAll(async () => {
    ({ adminUser, normalUser } = await jestSetup(['admin', 'normal']));
  });
  afterAll(jestTeardown);

  test('should response with a list of roles (as admin)', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/roles/${normalUser!._id}`).set({ 'Jest-User': adminUser!._id });
    expect(res.body).toEqual({ data: expect.arrayContaining(normalUser!.roles) });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when get roles as normal user', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/roles/${adminUser!._id}`).set({ 'Jest-User': normalUser!._id });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);
  });

  test('should fail when GET non-existing record', async () => {
    await getByIdNonExisting('roles', { 'Jest-User': adminUser!._id }, 'WRONG-ID');
  });

  test('should fail when try to add or remove ROOT role (as admin user)', async () => {
    expect.assertions(6);

    const data = { role: USER.ROLE.ROOT };
    const header = { 'Jest-User': adminUser!._id };

    // try to add ROOT role
    let res = await request(app).post(`/api/roles/${normalUser!._id}`).send(data).set(header);
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);

    // try to remove ROOT role
    res = await request(app).delete(`/api/roles/${normalUser!._id}`).send(data).set(header);
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);
  });

  test('should add & remove JEST-only role (as admin user)', async () => {
    expect.assertions(6);

    const role = USER.ROLE.JEST_FAKE_ROLE;
    const header = { 'Jest-User': adminUser!._id };

    // remove JEST_FAKE_ROLE before testing
    await User.updateOne(normalUser!, { $pull: { roles: role } });

    // adding role
    const addRes = await request(app).post(`/api/roles/${normalUser!._id}`).send({ role }).set(header);
    expect(addRes.body).toEqual({ data: expect.arrayContaining([role]) });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(201);

    // removing role
    const removeRes = await request(app).delete(`/api/roles/${normalUser!._id}`).send({ role }).set(header);
    expect(removeRes.body).toEqual({ data: expect.not.arrayContaining([role]) });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);
  });
});
