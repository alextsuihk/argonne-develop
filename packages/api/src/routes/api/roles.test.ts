/**
 * JEST Test: /api/roles routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { jestSetup, jestTeardown } from '../../jest';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { getByIdNonExisting } = commonTest;

// Top level of this test suite:
describe('Role API Routes', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response with a list of roles (as admin)', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/roles/${jest.normalUser._id}`).set({ 'Jest-User': jest.adminUser._id });
    expect(res.body).toEqual({ data: expect.arrayContaining(jest.normalUser.roles) });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when get roles as normal user', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/roles/${jest.adminUser._id}`).set({ 'Jest-User': jest.normalUser._id });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);
  });

  test('should fail when GET non-existing record', async () => {
    await getByIdNonExisting('roles', { 'Jest-User': jest.adminUser._id }, 'WRONG-ID');
  });

  test('should fail when try to add or remove ROOT role (as admin user)', async () => {
    expect.assertions(6);

    const data = { role: USER.ROLE.ROOT };

    // try to add ROOT role
    let res = await request(app)
      .post(`/api/roles/${jest.normalUser._id}`)
      .send(data)
      .set({ 'Jest-User': jest.adminUser._id });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);

    // try to remove ROOT role
    res = await request(app)
      .delete(`/api/roles/${jest.normalUser._id}`)
      .send(data)
      .set({ 'Jest-User': jest.adminUser._id });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);
  });

  test('should add & remove JEST-only role (as admin user)', async () => {
    expect.assertions(6);

    const role = USER.ROLE.JEST_FAKE_ROLE;

    // remove JEST_FAKE_ROLE before testing
    await User.updateOne(jest.normalUser, { $pull: { roles: role } });

    // adding role
    const addRes = await request(app)
      .post(`/api/roles/${jest.normalUser._id}`)
      .send({ role })
      .set({ 'Jest-User': jest.adminUser._id });
    expect(addRes.body).toEqual({ data: expect.arrayContaining([role]) });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(201);

    // removing role
    const removeRes = await request(app)
      .delete(`/api/roles/${jest.normalUser._id}`)
      .send({ role })
      .set({ 'Jest-User': jest.adminUser._id });
    expect(removeRes.body).toEqual({ data: expect.not.arrayContaining([role]) });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);
  });
});
