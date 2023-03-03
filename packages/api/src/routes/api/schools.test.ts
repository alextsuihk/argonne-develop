/**
 * JEST Test: /api/schools routes
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
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
import District from '../../models/district';
import Level from '../../models/level';
import type { SchoolDocument } from '../../models/school';
import type { UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { SCHOOL } = LOCALE.DB_ENUM;

const { createUpdateDelete, getMany } = commonTest;
const route = 'schools';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let adminUser: LeanDocument<UserDocument> | null;
  let url: string;
  let url2: string;

  // expected MINIMUM single school format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    district: expect.toBeOneOf([null, expect.any(String)]),
    levels: expect.arrayContaining([expect.any(String)]),
  };

  beforeAll(async () => {
    ({ adminUser } = await jestSetup(['admin']));
  });
  afterAll(async () => Promise.all([jestRemoveObject(url), jestRemoveObject(url2), jestTeardown()]));

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () => {
    const [districts, levels] = await Promise.all([
      District.find({ deletedAt: { $exists: false } }).lean(),
      Level.find({ code: { $regex: '[S][1-6]' }, deletedAt: { $exists: false } }),
    ]);

    [url, url2] = await Promise.all([jestPutObject(adminUser!), jestPutObject(adminUser!)]);

    const create = {
      code: FAKE,
      name: FAKE_LOCALE,
      phones: ['+852 12345678'],
      emi: prob(0.5),
      ...(prob(0.5) && { band: FAKE }),
      ...(prob(0.5) && { logoUrl: url }),
      ...(prob(0.5) && { website: 'http://jest.com' }),
      ...(prob(0.5) && { funding: Object.keys(SCHOOL.FUNDING).sort(shuffle)[0] }),
      ...(prob(0.5) && { gender: Object.keys(SCHOOL.GENDER).sort(shuffle)[0] }),
      ...(prob(0.5) && { religion: FAKE }),
      levels: idsToString(levels.sort(shuffle).slice(0, 3)),
    };

    const update = {
      code: FAKE,
      name: FAKE2_LOCALE,
      phones: ['+852 88887777'],
      emi: prob(0.5),
      website: 'http://jest2.com',
      levels: idsToString(levels.sort(shuffle).slice(0, 3)),
    };

    await createUpdateDelete<SchoolDocument>(route, { 'Jest-User': adminUser!._id }, [
      {
        action: 'create',
        data: { ...create, address: FAKE_LOCALE, district: randomId(districts) },
        expectedMinFormat: { ...expectedMinFormat, ...create, code: FAKE.toUpperCase() },
      },
      {
        action: 'addRemark',
        data: { remark: FAKE },
        expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(adminUser!, FAKE) },
      },
      {
        action: 'update',
        data: { ...update, code: 'NOT-ALLOWED-TO-CHANGE', address: FAKE2_LOCALE, district: randomId(districts) },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
        },
      },
      {
        action: 'update', // remove logoUrl
        data: { ...update, address: FAKE2_LOCALE, district: randomId(districts), logoUrl: '' },
        expectedMinFormat: { ...expectedMinFormat, ...update, code: FAKE.toUpperCase() },
      },
      {
        action: 'update', // add logoUrl back
        data: { ...update, address: FAKE2_LOCALE, district: randomId(districts), logoUrl: url2 },
        expectedMinFormat: { ...expectedMinFormat, ...update, code: FAKE.toUpperCase(), logoUrl: url2 },
      },
      { action: 'delete', data: {} },
    ]);
  });
});
