/**
 * JEST Test: /api/logs routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { FAKE, FAKE_LOCALE, jestSetup, jestTeardown, prob } from '../../jest';
import type { UserDocument } from '../../models/user';

const { MSG_ENUM } = LOCALE;

const route = 'logs';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUser: UserDocument | null;

  const expectedResponse = { code: MSG_ENUM.COMPLETED, id: expect.any(String) };

  beforeAll(async () => {
    ({ normalUser } = await jestSetup(['normal']));
  });
  afterAll(jestTeardown);

  test('should pass when POST log as normalUser', async () => {
    expect.assertions(3);
    const res = await request(app)
      .post(`/api/${route}`)
      .send({ level: 'info', msg: FAKE, ...(prob(0.5) && { extra: FAKE_LOCALE }), ...(prob(0.5) && { url: FAKE }) })
      .set({ 'Jest-User': normalUser!._id });
    expect(res.body).toEqual(expectedResponse);
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(201);
  });

  test('should pass when POST log as guestUser', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post(`/api/${route}`)
      .send({
        level: 'info',
        msg: FAKE,
        ...(prob(0.5) && { extra: FAKE_LOCALE }),
        ...(prob(0.5) && { url: FAKE }),
      });
    expect(res.body).toEqual(expectedResponse);
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(201);
  });
});
