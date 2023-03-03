// todo = 'webpush: to be implemented';
/**
 * Controller: System/Admin
 *
 * Note: This is an internal monitor system (admin access ONLY)
 */

import os from 'node:os';

import { LOCALE } from '@argonne/common';
import axios from 'axios';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { io } from 'socket.io-client';

import configLoader from '../config/config-loader';
import Job from '../models/job';
import Tenant from '../models/tenant';
import User from '../models/user';
import redisCache from '../redis';
import { isStagingMode, isTestMode } from '../utils/environment';
import { randomString } from '../utils/helper';
import log from '../utils/log';
import token from '../utils/token';
import common from './common';

type GetAction = 'health' | 'ping' | 'server-info' | 'status' | 'time';

const { MSG_ENUM } = LOCALE;
const { JOB } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;
const { assertUnreachable } = common;

const { buildInfo, mode } = configLoader.config;
const { version, hash, builtAt } = buildInfo;

let hubVersion: string | null = null;

export const updateHubVersion = async () => {
  config.mode === 'HUB'
    ? (hubVersion = null)
    : ({
        data: { version: hubVersion },
      } = await axios.get<Awaited<ReturnType<typeof getServerInfo>>>(
        `${DEFAULTS.ARGONNE_URL}/api/systems/server-info`,
      ));
};

// For Promise.race() timeout
const timer = {
  mongo: 0, // 0 for placeholder
  redis: 0,
  socket: 0,
};

const timeout = (milliseconds = 2000, task: keyof typeof timer) =>
  new Promise<number>(resolve => {
    timer[task] = setTimeout(resolve, milliseconds, { status: 'timeout', error: `timeout (${milliseconds})` });
  });

/**
 * Health Check
 */
const healthReport = () => ({
  startTime: new Date(config.startedAt).toLocaleString(),
  appUpTime: Math.floor((Date.now() - config.startedAt) / 1000),
  nodeUpTime: Math.floor(process.uptime()),
  freemem: Math.round(os.freemem() / 1024 / 1024),
  memoryUsage: {
    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    external: Math.round(process.memoryUsage().external / 1024 / 1024),
    arrayBuffers: Math.round(process.memoryUsage().external / 1024 / 1024),
  },
});

/**
 * Server Info
 */
const getServerInfo = async () => {
  const [primaryTenant, tenantCount] = await Promise.all([Tenant.findPrimary(), Tenant.countDocuments()]);

  return {
    mode,
    primaryTenantId: primaryTenant && primaryTenant._id.toString(), // null or string
    status:
      mode === 'HUB' ? 'ready' : tenantCount === 0 ? 'uninitialized' : tenantCount === 1 ? 'initializing' : 'ready',
    minio: config.server.minio.serverUrl,
    timestamp: Date.now(),
    version,
    hubVersion,
    hash,
    builtAt,
  };
};

/**
 * Get system Status
 */
const getStatus = async (req: Request) => {
  if (!req.userScopes?.includes('systems:r')) throw { statusCode: 403, code: MSG_ENUM.INVALID_API_KEY };

  /**
   * express server status
   */
  const { port } = config;

  /**
   * check logger service
   * (axios has built-in timeout, no need to re-invent Promise.race)
   */
  const checkLogger = async () => {
    const startedAt = Date.now();
    const url = DEFAULTS.LOGGER_URL;

    if (!config.loggerApiKey) return { url, status: 'improper configuration' };

    try {
      const { data } = await axios.get<ReturnType<typeof healthReport>>(`${url}/api/health`, {
        headers: { 'x-api-key': config.loggerApiKey },
        timeout: 2000,
      });
      return { url, status: 'up', timeElapsed: Date.now() - startedAt, ...data };
    } catch (error) {
      await log('error', '/api/systems/system:checkLogger error');
      return { url, status: 'down', timeElapsed: Date.now() - startedAt };
    }
  };

  /**
   * check Mongoose connection (promise)
   * wrapping with Promise.race to timeout in case mongoose connection is down
   */
  const checkMongo = Promise.race([
    timeout(2000, 'mongo'),

    (async () => {
      // wait 500ms for Jest test
      if (mongoose.connection.readyState !== 1) await new Promise(resolve => setTimeout(resolve, 300));
      if (mongoose.connection.readyState !== 1) await new Promise(resolve => setTimeout(resolve, 300));

      const state = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
      const pool = mongoose.connections.length;

      const startedAt = Date.now();
      try {
        const job = await Job.create({
          status: JOB.STATUS.COMPLETED,
          script: 'JEST',
          progress: 100,
          startAfter: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
        });
        await Job.findByIdAndDelete(job).exec(); // convert to a true promise
        clearTimeout(timer.mongo); // timer still runs async, so cleanly clearTimeout()
        return { state, status: 'up', pool, timeElapsed: Date.now() - startedAt };
      } catch (error) {
        await log('error', '/api/systems/system:checkMongo error', error);
        clearTimeout(timer.mongo); // timer still runs async, so cleanly clearTimeout()
        return { state, status: 'down', pool, timeElapsed: Date.now() - startedAt };
      }
    })(),
  ]);

  /**
   * check Redis connection (promise)
   *   wrapping with Promise.race to timeout in case redis connection is down
   */
  const checkRedis = Promise.race([
    timeout(2000, 'redis'),
    (async () => {
      // wait 500ms for Jest test
      if (redisCache.getStatus() !== 'ready') await new Promise(resolve => setTimeout(resolve, 200));
      if (redisCache.getStatus() !== 'ready') await new Promise(resolve => setTimeout(resolve, 200));

      const randomData = randomString();
      const startedAt = Date.now();
      const state = redisCache.getStatus();
      try {
        await redisCache.set(randomData, randomData, 50);
        const readBack = await redisCache.get(randomData);
        const status = readBack === randomData ? 'up' : 'down';
        clearTimeout(timer.redis); // timer still runs async, so cleanly clearTimeout()
        return { state, status, timeElapsed: Date.now() - startedAt };
      } catch (error) {
        await log('error', '/api/systems/system:checkRedis error');
        clearTimeout(timer.redis); // timer still runs async, so cleanly clearTimeout()
        return { state, status: 'down', timeElapsed: Date.now() - startedAt };
      }
    })(),
  ]);

  /**
   * check Socket.io connection
   */
  const checkSocket =
    isStagingMode || isTestMode
      ? { status: 'Not Available in Test Mode' } // cannot don't know the port#, Instead, socket-server.test.ts will cover this test.
      : Promise.race([
          timeout(2000, 'socket'),
          (async () => {
            const startedAt = Date.now();
            try {
              const testUser = await User.findOne({ flags: 'TESTER' }).lean();
              if (!testUser) return { status: 'improper configuration' };

              const socket = io(`http://127.0.0.1:${config.port}`);
              const accessToken = await token.sign({ id: testUser._id.toString() }, '5s');

              socket.once('JOIN', (receivedMsg: { token?: string; error?: string; msg?: string }) => {
                if (receivedMsg.token === accessToken) {
                  clearTimeout(timer.socket); // timer still runs async, so cleanly clearTimeout()
                  return { status: 'up', timeElapsed: Date.now() - startedAt };
                }
              });
              socket.emit('JOIN', { token: accessToken });
            } catch (error) {
              await log('error', '/api/systems/system:checkSocket error');
              clearTimeout(timer.socket); // timer still runs async, so cleanly clearTimeout()
              return { status: 'down', timeElapsed: Date.now() - startedAt };
            }
          })(),
        ]);

  // async () => {
  //   if (isStagingMode || isTestMode) return { status: 'Not Available in Test Mode' }; // cannot don't know the port#, Instead, socket-server.test.ts will cover this test.

  //   const startedAt = Date.now();
  //   try {
  //     const testUser = await User.findOne({ flags: 'TESTER' }).lean();
  //     if (!testUser) return { status: 'improper configuration' };

  //     const socket = io(`http://127.0.0.1:${config.port}`);
  //     const accessToken = await token.sign({ id: testUser._id.toString() }, '5s');

  //     socket.once('JOIN', (receivedMsg: { token?: string; error?: string; msg?: string }) => {
  //       if (receivedMsg.token === accessToken) return { status: 'up', timeElapsed: Date.now() - startedAt };
  //     });
  //     socket.emit('JOIN', { token: accessToken });
  //   } catch (error) {
  //     await log('error', '/api/systems/system:checkSocket error');
  //     return { status: 'down', timeElapsed: Date.now() - startedAt };
  //   }
  // };

  /**
   * check Web-Push subscription
   */
  // TODO: to be implemented
  const webpush = {
    status: 'no idea TODO (WIP)',
    // grantedSubscriptions: await User.countDocuments({
    //   'user.subscriptions.permission': 'granted',
    // }),
  };

  // wait until all promises are resolved
  const result = await Promise.all([checkLogger(), checkMongo, checkRedis, checkSocket]);
  const [logger, mongo, redis, socket] = result;
  return {
    mode: config.mode,
    timestamp: new Date(),
    logger,
    mongo,
    redis,
    server: { status: 'up', appUrl: `${req.protocol}://${req.hostname}`, port, ...healthReport() },
    socket,
    webpush,
  };
};

/**
 * Get Action (RESTful)
 */
const getAction: RequestHandler<{ action: GetAction }> = async (req, res, next) => {
  const { action } = req.params;

  try {
    switch (action) {
      case 'health':
        return res.status(200).json({ data: healthReport() });
      case 'ping':
        return res.status(200).json({ data: 'pong' });
      case 'server-info':
        return res.status(200).json({ data: await getServerInfo() });
      case 'status':
        return res.status(200).json({ data: await getStatus(req) });
      case 'time':
        return res.status(200).json({ data: Date.now() });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default { getAction, getServerInfo };
