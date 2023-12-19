/**
 * Seeder: Core Users
 *
 * system users with tenants
 */

import os from 'node:os';

import { LOCALE } from '@argonne/common';
import chalk from 'chalk';

import configLoader from '../../config/config-loader';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { mongoId, randomString } from '../../utils/helper';

const { USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

/**
 * Seeder()
 */
const seed = async (): Promise<string> => {
  // Part2: create users
  const adminPassword = User.genValidPassword(`${os.hostname}_`);

  const users: Partial<UserDocument>[] = [
    {
      status: USER.STATUS.SYSTEM,
      name: 'System',
      emails: [`system@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    },
    // {
    //   status: USER.STATUS.SYSTEM,
    //   name: 'OCR',
    //   emails: [`ocr@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    // },
    // {
    //   status: USER.STATUS.SYSTEM,
    //   name: 'Transcriber',
    //   emails: [`transcriber@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    // },
    {
      status: USER.STATUS.ACCOUNT,
      name: 'Account',
      emails: [`account@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    },
    {
      status: USER.STATUS.ACCOUNT,
      name: 'Withheld Account',
      emails: [`withheld@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    },
    {
      status: USER.STATUS.CHARITY,
      name: 'Charity Fund (關愛基金)',
      emails: [`charity@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    },
    {
      status: USER.STATUS.BOT,
      name: 'Robot (機械人)',
      emails: [`bot-001@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    },
    {
      status: USER.STATUS.BOT,
      name: 'Robot (機械人)',
      emails: [`bot-002@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    },
    {
      status: USER.STATUS.SYSTEM,
      flags: ['TESTER'],
      name: 'TESTER for testing checkSocket() by systemController',
      emails: [`${randomString()}@@${DEFAULTS.DOMAIN}`], // invalid email format, non-login-able
    },
    {
      _id: mongoId('654c52a152625f03784fb312'), // fixed _id for alex
      status: USER.STATUS.ACTIVE,
      name: 'Alex',
      emails: ['alex@inspire.hk', 'alex@alextsui.net'],
      password: adminPassword,
      roles: [USER.ROLE.ADMIN, USER.ROLE.ROOT],
      flags: DEFAULTS.USER.FLAGS,
      identifiedAt: new Date(),
    },
  ];

  // add common values to array
  const newUsers = users.map(
    user =>
      new User<Partial<UserDocument>>({ password: user.password ?? User.genValidPassword(), tenants: [], ...user }),
  );

  await User.insertMany<Partial<UserDocument>>(newUsers, { includeResultMetadata: true }); // must use create() to execute pre-save hook for password-hashing
  return `(${chalk.green(users.length)} created) [${chalk.bgCyan('adminPassword: ', adminPassword)}]`;
};

export { seed };
