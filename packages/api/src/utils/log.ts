/**
 * Log: send log message to external server
 *
 */

import axios from 'axios';
import chalk from 'chalk';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import LogEvent from '../models/event/log';
import { isDevMode, isTestMode } from './environment';

export type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const { config, DEFAULTS } = configLoader;
const { instance, pm2 } = config;

/**
 * Send { msg, optional fields } to Logger Server
 */
const log = async (
  level: Level,
  msg: string,
  extra?: unknown,
  user?: string | Types.ObjectId,
  url?: string,
): Promise<void> => {
  try {
    await Promise.all([
      config.loggerApiKey &&
        !isTestMode &&
        axios.post(
          `${DEFAULTS.LOGGER_URL}/api/logs`,
          { level, instance, pm2, msg, user, extra, url: url },
          { headers: { 'x-api-key': config.loggerApiKey }, timeout: 1000 },
        ),
      mongoose.connection.readyState === 1 && LogEvent.create({ user, level, msg, extra, url }), // mongoose might have closed in shutdown mode
    ]);

    if (isDevMode) {
      const lvl =
        level === 'error'
          ? chalk.red('ERROR')
          : level === 'warn'
          ? chalk.yellow('WARN')
          : level === 'info'
          ? chalk.green('INFO')
          : chalk.gray(level.toUpperCase());
      console.info(`${lvl}::[${chalk.blue(instance)}]: ${msg}`); // eslint-disable-line no-console
    }
  } catch (error) {
    if (error instanceof Error && error?.name !== 'MongoNotConnectedError')
      console.info(`${chalk.red('ERROR')}::[${chalk.blue(instance)}]: ${msg}`); // eslint-disable-line no-console
  }
};

export default log;
