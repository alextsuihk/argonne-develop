/**
 * JEST Test: /api/tenants routes
 *
 * ! Note: normalUser is jestTenant's admin
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  domain,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2,
  FAKE2_LOCALE,
  idsToString,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
  shuffle,
} from '../../jest';
import School from '../../models/school';
import { TenantDocument } from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;
const { createUpdateDelete, getMany } = commonTest;
const route = 'tenants';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let rootUser: LeanDocument<UserDocument> | null;
  let htmlUrl: string;
  let logoUrl: string;

  // expected MINIMUM single tenant format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    admins: expect.arrayContaining([expect.any(String)]), // must contain at least one non-log-in-able admin
    supports: expect.any(Array), // could be empty array
    counselors: expect.any(Array), // could be empty array
    marshals: expect.any(Array), // could be empty array

    services: expect.arrayContaining([expect.any(String)]),

    // website: expect.any(String),
    // logoUrl: expect.any(String), // could be undefined

    flaggedWords: expect.any(Array),
    updatedAt: expect.any(String),
  };

  beforeAll(async () => {
    ({ rootUser } = await jestSetup(['root']));
  });

  afterAll(async () =>
    Promise.all([htmlUrl && jestRemoveObject(htmlUrl), logoUrl && jestRemoveObject(logoUrl), jestTeardown()]),
  );

  test('should response a tenant list as guest user', async () => getMany(route, {}, expectedMinFormat, {}));

  test('should pass when ADD, ADD_REMARK, UPDATE, REMOVE', async () => {
    expect.assertions(3 * 4 + 3 * 1 + 3 * 2 + 6 * 1);

    const schools = await School.find({ deletedAt: { $exists: false } }).lean();

    const tenantCore = {
      code: FAKE,
      name: FAKE_LOCALE,
      ...(prob(0.5) && { school: randomId(schools) }),
      services: Object.keys(TENANT.SERVICE)
        .sort(shuffle)
        .slice(0, 3 * Math.random() + 1),
      ...(prob(0.5) && { satelliteUrl: `https://satellite.${domain}` }),
    };

    const tenantCoreUpdate = {
      code: FAKE,
      name: FAKE2_LOCALE,
      ...(prob(0.5) && { school: randomId(schools) }),
      services: Object.keys(TENANT.SERVICE)
        .sort(shuffle)
        .slice(0, 3 * Math.random() + 1),
      ...(prob(0.5) && { satelliteUrl: `https://satellite2.${domain}` }),
    };

    const tenant = await createUpdateDelete<TenantDocument>(
      route,
      { 'Jest-User': rootUser!._id }, // as root
      [
        {
          action: 'create',
          data: tenantCore,
          expectedMinFormat: { ...expectedMinFormat, ...tenantCore, code: FAKE.toUpperCase() },
        },
        {
          action: 'addRemark',
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(rootUser!, FAKE) },
        },
        {
          action: 'updateCore',
          data: { ...tenantCore, code: 'NOT-ALLOWED-TO-CHANGE' },
          expectedResponse: {
            statusCode: 422,
            data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
          },
        },
        {
          action: 'updateCore',
          data: tenantCoreUpdate,
          expectedMinFormat: { ...expectedMinFormat, ...tenantCoreUpdate, code: FAKE.toUpperCase() },
        },
      ],
      { skipAssertion: true },
    );
    const tenantId = tenant!._id.toString();

    // create two fake users
    const users = Array(2)
      .fill(0)
      .map(
        (_, idx) =>
          new User<Partial<UserDocument>>({
            name: `tenantAdmin (${idx})`,
            emails: [`tenant-admin-${idx}@${tenant!._id}.net`],
            password: User.genValidPassword(),
            tenants: [tenant!._id],
          }),
      );
    await User.create(users);

    await createUpdateDelete<TenantDocument>(
      route,
      { 'Jest-User': rootUser!._id }, // add admins as root
      [
        {
          action: 'update',
          data: {
            admins: idsToString(users),
            supports: [],
            counselors: [],
            marshals: [],
            website: 'https://example.com',
            flaggedWords: [],
          },
          expectedMinFormat: { ...expectedMinFormat, admins: idsToString(users) },
        },
      ],
      { skipAssertion: true, overrideId: tenantId },
    );

    const tenantExtra = {
      admins: idsToString(users),
      supports: [randomId(users)],
      counselors: [randomId(users)],
      marshals: [randomId(users)],
      website: `https://www.${domain}`,
      flaggedWords: prob(0.5) ? [] : [FAKE, FAKE2],
    };
    [htmlUrl, logoUrl] = await Promise.all([jestPutObject(users[0]), jestPutObject(users[0])]);

    await createUpdateDelete<TenantDocument>(
      route,
      { 'Jest-User': users[0]._id }, // as tenantAdmin
      [
        {
          action: 'update',
          data: { ...tenantExtra, htmlUrl },
          expectedMinFormat: { ...expectedMinFormat, ...tenantExtra, htmlUrl },
        },
        {
          action: 'update',
          data: { ...tenantExtra, htmlUrl: '', logoUrl },
          expectedMinFormat: { ...expectedMinFormat, ...tenantExtra, logoUrl },
        },
      ],
      { skipAssertion: true, overrideId: tenantId },
    );

    // remove
    await createUpdateDelete<TenantDocument>(
      route,
      { 'Jest-User': rootUser!._id }, //
      [{ action: 'delete', data: {} }],
      { skipAssertion: true, overrideId: tenantId },
    );
  });
});
