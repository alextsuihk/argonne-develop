/**
 * JEST Test: /api/schools routes
 *
 */

import { LOCALE } from '@argonne/common';

import {
  FAKE,
  FAKE2_LOCALE,
  FAKE_LOCALE,
  expectedDateFormat,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomItems,
} from '../../jest';
import District from '../../models/district';
import Level from '../../models/level';
import type { SchoolDocument } from '../../models/school';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { SCHOOL } = LOCALE.DB_ENUM;

const { createUpdateDelete, getMany } = commonTest;
const route = 'schools';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single school format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    district: expectedIdFormat,
    phones: expect.any(Array),

    // levels: expect.arrayContaining([expectedIdFormat]),
    levels: expect.any(Array), // could be empty for universities
    band: expect.toBeOneOf(Object.keys(SCHOOL.BAND)),
    funding: expect.toBeOneOf(Object.keys(SCHOOL.FUNDING)),
    gender: expect.toBeOneOf(Object.keys(SCHOOL.GENDER)),
    religion: expect.toBeOneOf(Object.keys(SCHOOL.RELIGION)),
    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () => {
    const [districts, levels] = await Promise.all([
      District.find({ deletedAt: { $exists: false } }).lean(),
      Level.find({ code: { $regex: '[S][1-6]' }, deletedAt: { $exists: false } }),
    ]);

    const [url, url2] = await Promise.all([jestPutObject(jest.adminUser._id), jestPutObject(jest.adminUser._id)]);

    const fake = (type: 'create' | 'update') => ({
      code: FAKE.toUpperCase(),
      name: type === 'create' ? FAKE_LOCALE : FAKE2_LOCALE,
      address: type === 'create' ? FAKE_LOCALE : FAKE2_LOCALE,
      district: randomItem(districts)._id.toString(),
      phones: type === 'create' ? ['+852 12345678'] : ['+852 98765432', '+852 88887777'],
      ...(prob(0.5) && { emi: prob(0.5) }),
      band: randomItem(Object.keys(SCHOOL.BAND)),
      ...(type === 'create' && { logoUrl: url, website: 'http://jest.com' }),
      funding: randomItem(Object.keys(SCHOOL.FUNDING)),
      gender: randomItem(Object.keys(SCHOOL.GENDER)),
      religion: randomItem(Object.keys(SCHOOL.RELIGION)),
      levels: randomItems(levels, 3)
        .map(level => level._id.toString())
        .sort(), // sort in alphanumeric order
    });

    const create = fake('create');
    const update = fake('update');

    await createUpdateDelete<SchoolDocument>(route, { 'Jest-User': jest.adminUser._id }, [
      { action: 'create', data: create, expectedMinFormat: { ...expectedMinFormat, ...create } },
      {
        action: 'addRemark',
        data: { remark: FAKE },
        expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(jest.adminUser._id, FAKE) },
      },
      {
        action: 'update',
        data: { ...update, code: 'NOT-ALLOWED-TO-CHANGE' },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
        },
      },
      {
        action: 'update', // remove logoUrl & website
        data: { ...update, logoUrl: '', website: '' },
        expectedMinFormat: { ...expectedMinFormat, ...update },
      },
      {
        action: 'update', // add logoUrl & website back
        data: { ...update, logoUrl: url2, website: 'http://jest2.com' },
        expectedMinFormat: { ...expectedMinFormat, ...update, logoUrl: url2, website: 'http://jest2.com' },
      },
      { action: 'delete', data: {} },
    ]);

    // clean up
    await Promise.all([jestRemoveObject(url), jestRemoveObject(url2)]);
  });
});
