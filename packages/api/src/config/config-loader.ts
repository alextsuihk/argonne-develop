/**
 * Single Point to mange config (env-specific) & constant (defaults)
 *
 */

import fs from 'node:fs';
import path from 'node:path';

import { isProdMode, isStagingMode, nodeEnv } from '../utils/environment';
import { randomString } from '../utils/helper';
import baseConfig from './base-config';
import DEFAULTS from './defaults';

type BuildInfo = {
  version: string;
  hash: string;
  builtAt: string;
};

// construct server build version & (latest) client version
const serverBuildFile = path.join(__dirname, '..', '..', 'dist', 'build.json');

const buildInfo: BuildInfo =
  (isProdMode || isStagingMode) && fs.existsSync(serverBuildFile)
    ? JSON.parse(fs.readFileSync(serverBuildFile, 'utf-8'))
    : { version: 'devMode', hash: `dev-${randomString()}`, builtAt: new Date().toISOString() };

const startedAt = Date.now(); // set when server start up
const pm2 = process.env.NODE_APP_INSTANCE || 'X';
const instance = `${nodeEnv}-${randomString().slice(-5)}-${pm2}`; // to identify instance

const init = async () => {
  // TODO:
  // Config.findOne(), if not found, insert....
  // insertOne({ jwtSecret: string;  compatibleClientVersion: string[], loggerApiKey: string, smtp: {}, oauths: {google: {id, secret}}: string})
  //
};

export default {
  config: { ...baseConfig, buildInfo, startedAt, pm2, instance },

  DEFAULTS,
};
