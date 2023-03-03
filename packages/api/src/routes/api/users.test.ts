/**
 * JEST Test: /api/users routes
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';
import request from 'supertest';

import app from '../../app';
import { domain, jestSetup, jestTeardown, shuffle } from '../../jest';
import type { UserDocument } from '../../models/user';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('User API Routes', () => {
  let normalUser: LeanDocument<UserDocument> | null;
  let tenantAdmin: LeanDocument<UserDocument> | null;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ normalUser, tenantAdmin, tenantId } = await jestSetup(['normal', 'tenantAdmin']));
  });

  afterAll(jestTeardown);

  test('should response true when email is available', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/users/isEmailAvailable/brand.new@${domain}`);
    expect(res.body).toEqual({ data: true });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should response false when email is not available', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/users/isEmailAvailable/${normalUser!.emails[0]}`);
    expect(res.body).toEqual({ data: false });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when checking with an invalid email format', async () => {
    expect.assertions(3);

    const res = await request(app).get('/api/users/isEmailAvailable/invalid@@email');
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'email' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });

  test.only('should pass when creating a tenantToken (as tenantAdmin)', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/users/tenantToken/${tenantId}`).set({ 'Jest-User': tenantAdmin!._id });
    expect(res.body).toEqual({ data: { token: expect.any(String), expireAt: expect.any(String) } });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test.only('should fail when creating a tenantToken (as normalUser or guest)', async () => {
    expect.assertions(3 * 2);

    // as non-tenantAdmin
    const res = await request(app).get(`/api/users/tenantToken/${tenantId}`).set({ 'Jest-User': normalUser!._id });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }],
      statusCode: 403,
      type: 'plain',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);

    // as guest
    const res2 = await request(app).get(`/api/users/tenantToken/${tenantId}`);
    expect(res2.body).toEqual({
      errors: [{ code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR }],
      statusCode: 401,
      type: 'plain',
    });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(401);
  });

  // TODO: full suite, verify email, add email, update profile.....  (& clean up)

  test('should pass when update user', async () => {
    console.log('TODO');
    // expect.assertions(13);
    // const [level] = (await Level.find({ deletedAt: { $exists: false } })).sort(shuffle);
    // const [subject] = (await Subject.find({ levels: level._id, deletedAt: { $exists: false } })).sort(shuffle);
    // const data = {
    //   ...(prob(0.5) && {note:  'Jest note'}) ,
    //   lang: Object.keys(QUESTION.LANG)[0]
    //     .sort(shuffle)
    //     .splice(2),
    //   subjectId: subject._id,
    //   levelId: level._id,
    // };
    // // add specialty
    // const addRes = await request(app).post(`/api/specialties`).send(data).set({ 'Jest-User': normalUser!._id });
    // expect(addRes.body).toEqual({ data: expectedFormat });
    // expect(addRes.status).toBe(201);
    // expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    // const newlyCreatedSpecialtyId = addRes.body.data.pop()!._id;
  });
});
