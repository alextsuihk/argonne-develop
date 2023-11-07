/**
 * JEST Test: /api/systems routes
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';
import request from 'supertest';

import app from '../../app';
import { jestSetup, jestTeardown, mongoId } from '../../jest';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import token, { API_KEY_TOKEN_PREFIX } from '../../utils/token';
import { sleep } from '../../utils/helper';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('System API Routes', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedMemoryUsage = {
    rss: expect.any(Number),
    heapTotal: expect.any(Number),
    heapUsed: expect.any(Number),
    external: expect.any(Number),
    arrayBuffers: expect.any(Number),
  };

  const expectedHealthReportFormat = {
    // startedAt: expect.any(String),
    startTime: expect.any(String), // logger reports {..., startTime}
    appUpTime: expect.any(Number),
    nodeUpTime: expect.any(Number),
    memoryUsage: expectedMemoryUsage,
    freemem: expect.any(Number),
  };

  const expectedStatusFormat = {
    mode: expect.toBeOneOf(['HUB', 'SATELLITE']),
    timestamp: expect.any(String),
    logger: expect.objectContaining({
      ...expectedHealthReportFormat,
      url: expect.stringContaining('http'),
      server: 'up',
      timeElapsed: expect.any(Number),
      tenant: expect.any(String),
      lastLogCreatedAt: expect.any(String),
    }),
    mongo: {
      pool: expect.any(Number),
      state: 'connected',
      server: 'up',
      timeElapsed: expect.any(Number),
    },
    redis: {
      state: 'ready',
      server: 'up',
      timeElapsed: expect.any(Number),
    },
    server: {
      port: expect.any(Number),
      server: 'up',
      appUrl: expect.stringContaining('http'),
      ...expectedHealthReportFormat,
    },
    socket: { server: 'Not Available in Test Mode' },
    webpush: expect.anything(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should report when health check', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/systems/health`);
    expect(res.body).toEqual({ data: expectedHealthReportFormat });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should respond with "Pong" when GET Ping', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/systems/ping`);
    expect(res.body).toEqual({ data: 'pong' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should return system status when Get Status', async () => {
    expect.assertions(3);

    const scope = 'systems:r';
    const apiKey = await token.signStrings([API_KEY_TOKEN_PREFIX, jest.normalUser._id, scope], 5);
    const _id = mongoId();
    await User.updateOne(
      { _id: jest.normalUser._id },
      { $push: { apiKeys: { _id, token: apiKey, expireAt: addSeconds(new Date(), 5), scope } } },
    );

    const res = await request(app).get(`/api/systems/status`).set({ 'x-api-key': apiKey });
    expect(res.body).toEqual({ data: expectedStatusFormat });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);

    // clean up
    await User.updateOne({ _id: jest.normalUser._id }, { $pull: { apiKeys: { _id } } });
  });

  test('should respond with serverInfo', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/systems/server-info`);
    expect(res.body).toEqual({
      data: {
        mode: expect.toBeOneOf(['HUB', 'SATELLITE']),
        primaryTenantId: expect.toBeOneOf([null, expect.any(String)]),
        status: expect.any(String), // logically, should never be null (but could be programmatically)
        minio: expect.any(String),
        timestamp: expect.any(Number),
        version: expect.any(String),
        hubVersion: expect.toBeOneOf([null, expect.any(String)]),
        hash: expect.any(String),
        builtAt: expect.any(String),
      },
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when Get Status without API Key', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/systems/status`);
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.INVALID_API_KEY }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);
  });

  test('should fail when Get Status with expired API Key', async () => {
    expect.assertions(3);

    const apiKey = await token.signStrings([API_KEY_TOKEN_PREFIX, jest.normalUser._id, 'systems:r'], '50ms');
    await sleep(100); // wait until API JWT expires

    const res = await request(app).get(`/api/systems/status`).set({ 'x-api-key': apiKey });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.TOKEN_EXPIRED }], statusCode: 400, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(400);
  });
});
