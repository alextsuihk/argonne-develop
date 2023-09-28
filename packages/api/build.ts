/**
 * Generate "dist/build.json" to track build time & version
 *
 * ! This build utility is run with '$ yarn build' to generate build.json
 * build.json is parsed (with ./env/base), as part of configLoader.config
 *
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { randomString } from './src/utils/helper';

/**
 * Generate hash code & builtAt information and write to build.json
 *
 */
const { version }: { version: string } = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const [major, minor, patch, rest] = version.split('.');
if (isNaN(Number(major)) || isNaN(Number(minor)) || !patch || rest)
  throw `build.ts: Incorrect Version Schema ${version}`;

const now = new Date();
const buildInfo = {
  version,
  hash: `${randomString().toUpperCase()}`,
  builtAt: now.toISOString(),
  user: os.userInfo().username,
  hostname: os.hostname(),
  arch: os.arch(),
};

// eslint-disable-next-line no-console
console.log(
  `/dist/build.json is updated. version: ${version} - hash: ${buildInfo.hash} - builtAt: ${buildInfo.builtAt}`,
);
fs.writeFileSync(path.join(__dirname, 'dist', 'build.json'), JSON.stringify(buildInfo));
