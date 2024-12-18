/**
 * JEST Test: /api/analytics routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { FAKE, jestSetup, jestTeardown, prob } from '../../jest';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe(`Analytics API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when POST session data', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post(`/api/analytics/session`)
      .set({ 'Jest-User': jest.normalUser._id })
      .send({ fullscreen: prob(0.5), token: FAKE });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(201);
  });
});
