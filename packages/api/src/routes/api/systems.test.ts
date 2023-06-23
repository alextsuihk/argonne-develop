/**
 * JEST Test: /api/systems routes
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import { jestSetup, jestTeardown } from '../../jest';
import type { Id, UserDocument } from '../../models/user';
import token from '../../utils/token';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('System API Routes', () => {
  let normalUser: (UserDocument & Id) | null;

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
      status: 'up',
      timeElapsed: expect.any(Number),
      tenant: expect.any(String),
      lastLogCreatedAt: expect.any(String),
    }),
    mongo: {
      pool: expect.any(Number),
      state: 'connected',
      status: 'up',
      timeElapsed: expect.any(Number),
    },
    redis: {
      state: 'ready',
      status: 'up',
      timeElapsed: expect.any(Number),
    },
    server: {
      port: expect.any(Number),
      status: 'up',
      appUrl: expect.stringContaining('http'),
      ...expectedHealthReportFormat,
    },
    socket: { status: 'Not Available in Test Mode' },
    webpush: expect.anything(),
  };

  beforeAll(async () => {
    ({ normalUser } = await jestSetup(['normal']));
  });
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

    const apiKey = await token.generateApi(
      { userId: normalUser!._id.toString() ?? 'invalid', scope: 'systems:r' },
      '5s',
    );
    const res = await request(app).get(`/api/systems/status`).set({ 'x-api-key': apiKey });
    expect(res.body).toEqual({ data: expectedStatusFormat });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should respond with serverInfo', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/systems/server-info`);
    expect(res.body).toEqual({
      data: {
        mode: expect.toBeOneOf(['HUB', 'SATELLITE']),
        primaryTenantId: expect.toBeOneOf([null, expect.any(String)]),
        status: expect.toBeOneOf(['ready', 'uninitialized', 'initializing']),
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

    const apiKey = await token.generateApi({ userId: 'whatever', scope: 'systems:r' }, '50ms');
    await new Promise(resolve => setTimeout(resolve, 100)); // wait until API JWT expires

    const res = await request(app).get(`/api/systems/status`).set({ 'x-api-key': apiKey });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.TOKEN_EXPIRED }], statusCode: 400, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(400);
  });
});
