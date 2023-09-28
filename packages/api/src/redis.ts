/**
 * Configure Redis service
 * (using ioredis)
 *
 * ! NOTE: convert from callback to promise
 * https://github.com/NodeRedis/node_redis
 *
 */

import { LOCALE } from '@argonne/common';
import Redis from 'ioredis';

import configLoader from './config/config-loader';
import { isTestMode } from './utils/environment';
import log from './utils/log';

const { MSG_ENUM } = LOCALE;
const { config, DEFAULTS } = configLoader;

const redis = new Redis(config.server.redis.url);
export const redisClient = redis;

// log error
redis.on('error', error => log('error', 'ioredis encounters error', error));
redis.on('connect', () => {
  if (isTestMode) log('info', 'ioredis is connected');
  redis.flushdb(); // in case of stale cache
});

const waitForReady = async () => {
  if (redis.status !== 'ready') await new Promise(resolve => setTimeout(resolve, 50));
  if (redis.status !== 'ready') await new Promise(resolve => setTimeout(resolve, 100));
  if (redis.status !== 'ready') await new Promise(resolve => setTimeout(resolve, 200));
  if (redis.status !== 'ready') throw { statusCode: 500, code: MSG_ENUM.REDIS_NOT_READY };
};

/**
 * delete a specific key
 */
const deleteKey = async (key: string, prefix = DEFAULTS.REDIS.PREFIX): Promise<boolean | null> => {
  await waitForReady();

  try {
    await redis.del(prefix + key);
    return true;
  } catch (error) {
    log('info', `FAIL to delete Redis key (${prefix + key}) ...`, error);
    return false;
  }
};

/**
 * flush entire database
 *
 */
const flushDb = async (): Promise<boolean | null> => {
  await waitForReady();

  try {
    await redis.flushdb();
    return true;
  } catch (error) {
    log('warn', 'FAIL to flush Redis DB ...', error);
    return false;
  }
};

/**
 * get content from a specific key
 */
const get = async <T>(key: string, prefix = DEFAULTS.REDIS.PREFIX): Promise<T | null | 'nullX'> => {
  await waitForReady();

  try {
    const value = await redis.get(prefix + key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    return 'nullX';
  }
};

/**
 * get Redis connection status
 */
const getStatus = (): string => redis.status;

/**
 * set redis cache
 */
const set = async <T>(
  key: string,
  value: T,
  expiry = DEFAULTS.REDIS.EXPIRES.DEFAULT,
  prefix = DEFAULTS.REDIS.PREFIX,
): Promise<T> => {
  await waitForReady();

  try {
    await redis.set(prefix + key, JSON.stringify(value), 'EX', expiry);
    return value;
  } catch (error) {
    log('info', `FAIL to set Redis key (${prefix + key}) ...`, error);
    return value;
  }
};

export default { deleteKey, flushDb, get, getStatus, set };
