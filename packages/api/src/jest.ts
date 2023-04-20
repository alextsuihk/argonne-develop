/**
 * Commonly used expected format & functions for jest
 *
 */

import 'jest-extended';

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { LeanDocument, Types } from 'mongoose';
import mongoose from 'mongoose';

import { ApolloServer, testServer } from './apollo';
import configLoader from './config/config-loader';
import jobRunner from './job-runner';
import Upload from './models/presigned-url';
import Tenant from './models/tenant';
import type { UserDocument } from './models/user';
import User from './models/user';
import { redisClient } from './redis';
import socketServer from './socket-server';
import { idsToString, randomString, schoolYear, shuffle, terminate } from './utils/helper';
import { client as minioClient, privateBucket, publicBucket } from './utils/storage';

export { ApolloServer, testServer } from './apollo';
export { idsToString, prob, randomId, randomString, shuffle } from './utils/helper';

type JestSetup = {
  adminServer: ApolloServer | null;
  adminUser: LeanDocument<UserDocument> | null;
  guestServer: ApolloServer | null;
  normalServer: ApolloServer | null;
  normalUser: LeanDocument<UserDocument> | null;
  normalUsers: LeanDocument<UserDocument>[] | null;
  rootServer: ApolloServer | null;
  rootUser: LeanDocument<UserDocument> | null;
  tenantAdmin: LeanDocument<UserDocument> | null;
  tenantAdminServer: ApolloServer | null;
  tenantId: string | null;
};
const { USER } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;
const { mongo } = config.server;

export const domain = `jest-${randomString()}.net`; // unique domain is generated for each jest suite

export const FAKE = `Jest Data: ${domain}`;
export const FAKE_ID = new mongoose.Types.ObjectId().toString();
export const FAKE_LOCALE = { enUS: `ENG: ${domain}`, zhCN: `CHS: ${domain}`, zhHK: `CHT: ${domain}` };
export const FAKE2 = `Jest Data2: ${domain}`;
export const FAKE2_LOCALE = { enUS: `ENG2: ${domain}`, zhCN: `CHS2: ${domain}`, zhHK: `CHT2: ${domain}` };

/**
 * expect() helper for apollo Jest
 *
 * note: in case error, data could be either null or undefined
 */
export const apolloExpect = (
  res: unknown,
  type: 'data' | 'error' | 'errorContaining',
  expected: Record<string, unknown> | string,
) => {
  if (type === 'data') return expect(res).toEqual({ http: expect.anything(), data: expected });

  if (type === 'error' && typeof expected === 'string')
    return expect(res).toEqual(
      expect.objectContaining({
        http: expect.anything(),
        errors: [expect.objectContaining({ message: expected })],
      }),
    );

  if (type === 'errorContaining' && typeof expected === 'string')
    return expect(res).toEqual(
      expect.objectContaining({
        http: expect.anything(),
        errors: [
          expect.objectContaining({
            message: expect.stringContaining(expected),
          }),
        ],
      }),
    );
};

// expected Address Format
export const expectedAddressFormat = expect.objectContaining({
  location: expect.objectContaining({ coordinates: expect.any(Array) }),
});

// expected ID Format
export const expectedIdFormat = expect.any(String);

// expected Content Format
export const expectedContentFormat = expect.objectContaining({
  _id: expectedIdFormat,
  flags: expect.any(Array),
  parents: expect.arrayContaining([expect.any(String)]),
  creator: expect.any(String),
  data: expect.any(String),
});

// expected Min Contribution Format
export const expectedContributionFormat = expect.objectContaining({
  _id: expectedIdFormat,
  flags: expect.any(Array),
  title: expect.any(String),
  contributors: expect.arrayContaining([
    expect.objectContaining({ user: expect.any(String), name: expect.any(String), school: expect.any(String) }),
  ]),
  urls: expect.arrayContaining([expect.any(String)]),
});

// expected Locale Format
export const expectedLocaleFormat = {
  enUS: expect.any(String),
  zhHK: expect.any(String),
  zhCN: expect.any(String),
};

// expected Remark (only work for single addRemark)
export const expectedRemark = (user: LeanDocument<UserDocument>, msg: string, isApollo = false) => ({
  remarks: [
    { _id: expect.any(String), t: isApollo ? expect.any(Number) : expect.any(String), u: user._id.toString(), m: msg },
  ],
});

// expected User
export const expectedUserFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),

  // tenants: expect.arrayContaining([expect.any(String)]),
  tenants: expect.any(Array), // newly registered user & user added by ROOT (e.g publisher) does not tenant
  status: USER.STATUS.ACTIVE,
  name: expect.any(String),
  // formalName: expect.any(Object),
  emails: expect.arrayContaining([expect.any(String)]),

  oAuth2s: expect.any(Array),

  // avatarUrl: expect.any(String), // could be undefined
  // mobile: expect.any(String), // could be undefined
  // whatsapp: expect.any(String), // could be undefined

  timezone: expect.any(String),
  locale: expect.any(String),
  darkMode: expect.any(Boolean),
  // theme: expect.any(String), // optional, could be undefined

  apiKeys: expect.any(Array),
  roles: expect.any(Array),
  features: expect.any(Array),
  scopes: expect.any(Array),

  coin: expect.any(Number),
  virtualCoin: expect.any(Number),
  balanceAuditedAt: expect.any(String),

  paymentMethods: expect.any(Array),
  // preference: expect.any(String), // could be undefined
  subscriptions: expect.any(Array),
  interests: expect.any(Array),
  supervisors: expect.any(Array),
  staffs: expect.any(Array),

  violations: expect.any(Array),

  expoPushTokens: expect.any(Array),
  creditability: expect.any(Number),

  studentIds: expect.any(Array),
  histories: expect.any(Array), // could be empty array

  favoriteTutors: expect.any(Array),

  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  // deletedAt: expect.toBeOneOf([null, expect.any(String)]), // undefined for RESTful, null for apollo
};

// Apollo date is number (float)
export const expectedUserFormatApollo = {
  ...expectedUserFormat,
  balanceAuditedAt: expect.any(Number),
  identifiedAt: expect.toBeOneOf([null, expect.any(Number)]),

  createdAt: expect.any(Number),
  updatedAt: expect.any(Number),
  deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
};

export const genClassroomUsers = (
  tenant: string | Types.ObjectId,
  school: string | Types.ObjectId,
  level: string | Types.ObjectId,
  schoolClass: string,
  count: number,
) =>
  Array(count)
    .fill(0)
    .map(
      (_, idx) =>
        new User<Partial<UserDocument>>({
          name: `student-${idx}`,
          flags: DEFAULTS.USER.FLAGS,
          emails: [`student-${idx}@${domain}`],
          password: User.genValidPassword(),
          tenants: [tenant],
          histories: [{ year: schoolYear(), school, level, schoolClass, updatedAt: new Date() }],
        }),
    );

export const jestPutObject = async (
  user: LeanDocument<UserDocument> | string | Types.ObjectId,
  bucketType: 'private' | 'public' = 'public',
): Promise<string> => {
  const image = await fsPromises.readFile(path.join(__dirname, 'jest.png'));
  const bucketName = bucketType === 'private' ? privateBucket : publicBucket;

  const objectName = randomString('png');
  await Promise.all([
    minioClient.putObject(publicBucket, objectName, image),
    Upload.create({
      user,
      url: `/${bucketName}/${objectName}`,
      expireAt: addSeconds(Date.now(), DEFAULTS.STORAGE.PRESIGNED_URL_PUT_EXPIRY + 5),
    }),
  ]);

  return `/${publicBucket}/${objectName}`;
};

export const jestRemoveObject = async (url: string): Promise<void> => {
  const [, bucketName, objectName] = url.split('/');
  if (bucketName && objectName) await minioClient.removeObject(bucketName, objectName);
};

/**
 * Setup Jest (for both restful API & apollo)
 * connect mongoose & fetch users, optionally setup apollo test-server
 */
export const jestSetup = async (
  types: Array<'admin' | 'guest' | 'normal' | 'root' | 'tenantAdmin'>,
  options?: { code?: string; apollo?: boolean },
): Promise<JestSetup> => {
  const code = options?.code ?? 'JEST';
  const apollo = !!options?.apollo;
  await mongoose.connect(mongo.url, { autoIndex: false });
  // mongoose.set('debug', true);

  const tenantNeeded = types.includes('normal') || types.includes('tenantAdmin');

  const tenant = tenantNeeded ? await Tenant.findOne({ code }).lean() : null;

  if (tenantNeeded && !tenant?.admins.length)
    return terminate(
      `jesSetup() Tenant (${code}) is inappropriate configured. Please re-init database by running $ yarn database:dev --drop --seed --fake`,
    );

  const [allUsers, adminUser, rootUser] = await Promise.all([
    tenant
      ? User.find({
          status: USER.STATUS.ACTIVE,
          tenants: tenant._id,
          roles: { $nin: [USER.ROLE.ADMIN] },
          identifiedAt: { $exists: true }, // newly jest created user will be excluded (to avoid racing connflict)
        }).lean()
      : null,
    types.includes('admin') ? User.findOneActive({ roles: USER.ROLE.ADMIN }) : null,
    types.includes('root') ? User.findOneActive({ roles: USER.ROLE.ROOT }) : null,
  ]);

  const normalUsers =
    tenant && allUsers
      ? allUsers
          .filter(user => !idsToString(tenant.admins).includes(user._id.toString()))
          .filter(u => ((apollo ? 0 : 1) + u.idx) % 2) // half for apollo-test, another half for restful
          .sort(shuffle) // randomize
      : null;

  if (normalUsers !== null && !normalUsers.length)
    return terminate('We have a problem, there is no normal users (it is required by the test) !');

  const [normalUser] = normalUsers ?? [null];

  const tenantAdmin =
    tenant && allUsers
      ? allUsers.filter(user => idsToString(tenant.admins).includes(user._id.toString()))[apollo ? 1 : 0]
      : null;

  const [adminServer, guestServer, normalServer, rootServer, tenantAdminServer] = [
    apollo && types.includes('admin') ? testServer(adminUser) : null,
    apollo && types.includes('guest') ? testServer() : null,
    apollo && types.includes('normal') ? testServer(normalUser) : null,
    apollo && types.includes('root') ? testServer(rootUser) : null,
    tenant && apollo && types.includes('tenantAdmin') ? testServer(tenantAdmin!) : null,
  ];

  return {
    adminServer,
    adminUser,
    guestServer,
    normalServer,
    normalUser,
    normalUsers,
    rootUser,
    rootServer,
    tenantAdmin,
    tenantAdminServer,
    tenantId: tenant ? tenant._id.toString() : null,
  };
};

/**
 * shutdown jest-server & close mongoose connection pool
 */
export const jestTeardown = async (): Promise<void> => {
  redisClient.disconnect();
  await Promise.all([jobRunner.stop(), socketServer.stop(), mongoose.connection.close()]);
};

/**
 * Generate an unique Test User
 */
export const uniqueTestUser = (): { email: string; name: string; password: string } => {
  // const email = `jest@${domain}`;
  // const idx = email.indexOf('@');
  return {
    // email: [email.slice(0, idx), `-${randomString()}`, email.slice(idx)].join(''),
    email: `jest-${randomString()}@${domain}`,
    name: `Jest User ${domain}`,
    password: User.genValidPassword(),
  };
};
