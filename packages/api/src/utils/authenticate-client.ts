/**
 * Authenticating Client
 *
 * check clients (with probable JWT-encrypted hash)
 *
 * ! NOTE: This project is open-sourced, need to avoid privately builds to access
 */

// authenticate client

import { LOCALE } from '@argonne/common';
import bcrypt from 'bcryptjs';

import configLoader from '../config/config-loader';
import { isDevMode, isTestMode } from './environment';

const { config } = configLoader;
const { MSG_ENUM } = LOCALE;

const authenticate = async (token?: string): Promise<void> => {
  if (isDevMode || isTestMode) return; // TODO: to be removed

  if (token) {
    const [version, timestamp, hash] = token.split('###');

    if (
      version &&
      timestamp &&
      Math.abs(Number(timestamp) - Date.now()) < 5000 &&
      hash &&
      (await bcrypt.compare(
        hash,
        `${config.compatibleClients.find(clientVersion => clientVersion.startsWith(version))}###${timestamp}`,
      ))
    )
      return;
  }
  throw { statusCode: 400, code: MSG_ENUM.INVALID_CLIENT_VERSION };
};

export default authenticate;
