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
import type { JobDocument } from '../models/job';
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
const { assertUnreachable, isAdmin } = common;

const { buildInfo, mode } = configLoader.config;
const { version, hash, builtAt } = buildInfo;

const TIMEOUT = DEFAULTS.AXIOS_TIMEOUT + 500;

// let hubVersion: string | null = null;

export const updateHubVersion = async (): Promise<string> => {
  if (config.mode === 'HUB') return version;

  const HUB_VERSION_KEY = 'hubVersion';
  const cached = await redisCache.get(HUB_VERSION_KEY);
  if (typeof cached === 'string') return cached;

  const { data } = await axios.get<Awaited<ReturnType<typeof getServerInfo>>>(
    `${DEFAULTS.ARGONNE_URL}/api/systems/server-info`,
    { timeout: DEFAULTS.AXIOS_TIMEOUT },
  );

  const { version: hubVersion } = data;
  await redisCache.set(HUB_VERSION_KEY, hubVersion);
  return hubVersion;
};

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
  const [primaryTenant, hubVersion] = await Promise.all([Tenant.findPrimary(), updateHubVersion()]);

  return {
    mode,
    primaryTenantId: primaryTenant && primaryTenant._id.toString(), // null or string
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
  if (!isAdmin(req.userRoles) && req.apiScope !== 'systems:r')
    throw { statusCode: 403, code: MSG_ENUM.INVALID_API_KEY };

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

    if (!config.loggerApiKey) return { url, server: 'improper configuration' };

    try {
      const { data } = await axios.get<ReturnType<typeof healthReport>>(`${url}/api/health`, {
        headers: { 'x-api-key': config.loggerApiKey },
        timeout: DEFAULTS.AXIOS_TIMEOUT,
      });
      return { url, server: 'up', timeElapsed: Date.now() - startedAt, ...data };
    } catch (error) {
      await log('error', '/api/systems/system:checkLogger error');
      return { url, server: 'down', timeElapsed: Date.now() - startedAt };
    }
  };

  /**
   * check Mongoose connection (promise)
   * wrapping with Promise.race to timeout in case mongoose connection is down
   */
  const checkMongo = async () => {
    if (mongoose.connection.readyState !== 1) await new Promise(resolve => setTimeout(resolve, 50));
    if (mongoose.connection.readyState !== 1) await new Promise(resolve => setTimeout(resolve, 100));
    if (mongoose.connection.readyState !== 1) await new Promise(resolve => setTimeout(resolve, 200));

    const state = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
    const pool = mongoose.connections.length;

    const startedAt = Date.now();
    try {
      const job = await Job.create<Partial<JobDocument>>({
        status: JOB.STATUS.COMPLETED,
        title: 'JEST',
        progress: 100,
        startAfter: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'JEST mongoDB test',
      });
      await Job.findByIdAndDelete(job); // convert to a true promise
      return { state, server: 'up', pool, timeElapsed: Date.now() - startedAt };
    } catch (error) {
      await log('error', '/api/systems/system:checkMongo error', error);
      return { state, server: 'down', pool, timeElapsed: Date.now() - startedAt };
    }
  };

  /**
   * check Redis connection (promise)
   *   wrapping with Promise.race to timeout in case redis connection is down
   */
  const checkRedis = async () => {
    const randomData = randomString();
    const startedAt = Date.now();
    const state = redisCache.getStatus();
    try {
      await redisCache.set(randomData, randomData, 500);
      const readBack = await redisCache.get(randomData);
      return { state, server: readBack === randomData ? 'up' : 'down', timeElapsed: Date.now() - startedAt };
    } catch (error) {
      await log('error', '/api/systems/system:checkRedis error');
      return { state, server: 'down', timeElapsed: Date.now() - startedAt };
    }
  };

  /**
   * check Socket.io connection
   */
  const checkSocket = async () => {
    if (isStagingMode || isTestMode) return { server: 'Not Available in Test Mode' }; // cannot don't know the port#, Instead, socket-server.test.ts will cover this test.

    const startedAt = Date.now();
    try {
      const testUser = await User.findOne({ flags: 'TESTER' }).lean();
      if (!testUser) return { server: 'improper configuration' };

      const socket = io(`http://127.0.0.1:${config.port}`);
      const { accessToken } = await token.createTokens(testUser, {
        ip: '127.0.0.1',
        ua: 'Jest-User-Agent',
        expiresIn: 5,
      });

      socket.once('JOIN', (receivedMsg: { token?: string; error?: string; msg?: string }) => {
        if (receivedMsg.token === accessToken) {
          return { server: 'up', timeElapsed: Date.now() - startedAt };
        }
      });
      socket.emit('JOIN', { token: accessToken });
    } catch (error) {
      await log('error', '/api/systems/system:checkSocket error');
      return { server: 'down', timeElapsed: Date.now() - startedAt };
    }
  };

  // async () => {
  //   if (isStagingMode || isTestMode) return { server: 'Not Available in Test Mode' }; // cannot don't know the port#, Instead, socket-server.test.ts will cover this test.

  //   const startedAt = Date.now();
  //   try {
  //     const testUser = await User.findOne({ flags: 'TESTER' }).lean();
  //     if (!testUser) return { server: 'improper configuration' };

  //     const socket = io(`http://127.0.0.1:${config.port}`);
  //     const accessToken = await token.sign({ id: testUser._id.toString() }, '5s');

  //     socket.once('JOIN', (receivedMsg: { token?: string; error?: string; msg?: string }) => {
  //       if (receivedMsg.token === accessToken) return { server: 'up', timeElapsed: Date.now() - startedAt };
  //     });
  //     socket.emit('JOIN', { token: accessToken });
  //   } catch (error) {
  //     await log('error', '/api/systems/system:checkSocket error');
  //     return { server: 'down', timeElapsed: Date.now() - startedAt };
  //   }
  // };

  /**
   * check Web-Push subscription
   */
  // TODO: to be implemented
  const webpush = {
    server: 'no idea TODO (WIP)',
    // grantedSubscriptions: await User.countDocuments({
    //   'user.subscriptions.permission': 'granted',
    // }),
  };

  const promiseWithTimeout = async <T>(promise: Promise<T>, ms = TIMEOUT) => {
    let timerId: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        reject(`timeout (${ms}ms)`);
      }, ms);
    });

    const result = await Promise.race([promise, timeout]);
    clearTimeout(timerId); // be clean, particularly for JEST (unreference before test ends)
    return result;
  };

  // wait until all promises are resolved (or reject with timeout)
  const [logger, mongo, redis, socket] = await Promise.allSettled([
    promiseWithTimeout(checkLogger()),
    promiseWithTimeout(checkMongo()),
    promiseWithTimeout(checkRedis()),
    promiseWithTimeout(checkSocket()),
  ]);

  const showResult = <T>(result: PromiseSettledResult<T>) =>
    result.status === 'fulfilled' ? result.value : { error: `reason: ${result.reason}` };

  return {
    mode: config.mode,
    timestamp: new Date(),
    logger: showResult(logger),
    mongo: showResult(mongo),
    redis: showResult(redis),
    server: { server: 'up', appUrl: `${req.protocol}://${req.hostname}`, port, ...healthReport() },
    socket: showResult(socket),
    webpush,
  };
};

/**
 * Get Action (RESTful)
 */
const getHandler: RequestHandler<{ action: GetAction }> = async (req, res, next) => {
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

export default { getHandler, getServerInfo };
