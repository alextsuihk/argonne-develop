/**
 * JEST Test: /api/presigned-urls routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { jestSetup, jestTeardown } from '../../jest';
import type { UserDocument } from '../../models/user';

const { MSG_ENUM } = LOCALE;

const route = 'presigned-urls';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUser: UserDocument | null;

  const expectedFormat = {
    url: expect.any(String),
    expiry: expect.any(Number),
  };

  beforeAll(async () => {
    ({ normalUser } = await jestSetup(['normal']));
  });
  afterAll(jestTeardown);

  test('should pass when creating (requesting) a presignedUrl', async () => {
    expect.assertions(3 * 2);

    const res = await request(app)
      .post(`/api/${route}`)
      .set({ 'Jest-User': normalUser!._id })
      .send({ bucketType: 'private', ext: 'PDF' });
    expect(res.body).toEqual({ data: expectedFormat });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(201);

    const res2 = await request(app)
      .post(`/api/${route}`)
      .set({ 'Jest-User': normalUser!._id })
      .send({ bucketType: 'public', ext: 'xlsx' });
    expect(res2.body).toEqual({ data: expectedFormat });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(201);
  });

  test('should fail with invalid bucketType or other invalid inputs', async () => {
    expect.assertions(3 * 3);

    // invalid bucketType
    const res1 = await request(app)
      .post(`/api/${route}`)
      .set({ 'Jest-User': normalUser!._id })
      .send({ bucketType: 'invalid', ext: 'docs' });
    expect(res1.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }],
      statusCode: 422,
      type: 'plain',
    });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(422);

    // without bucketType
    const res2 = await request(app).post(`/api/${route}`).set({ 'Jest-User': normalUser!._id }).send({ ext: 'docs' });
    expect(res2.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'bucketType' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(422);

    // without ext
    const res3 = await request(app)
      .post(`/api/${route}`)
      .set({ 'Jest-User': normalUser!._id })
      .send({ bucketType: 'public' });
    expect(res3.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'ext' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res3.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res3.status).toBe(422);
  });
});
