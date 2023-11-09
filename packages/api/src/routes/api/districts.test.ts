/**
 * JEST Test: /api/districts routes
 *
 */

import {
  expectedDateFormat,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2_LOCALE,
  jestSetup,
  jestTeardown,
} from '../../jest';
import type { DistrictDocument } from '../../models/district';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany } = commonTest;

const route = 'districts';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single district format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    region: expectedLocaleFormat,
    name: expectedLocaleFormat,
    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () =>
    createUpdateDelete<DistrictDocument>(route, { 'Jest-User': jest.adminUser._id }, [
      {
        action: 'create',
        data: { name: FAKE_LOCALE, region: FAKE2_LOCALE },
        expectedMinFormat: { ...expectedMinFormat, name: FAKE_LOCALE, region: FAKE2_LOCALE },
      },
      {
        action: 'addRemark',
        data: { remark: FAKE },
        expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(jest.adminUser._id, FAKE) },
      },
      {
        action: 'update',
        data: { name: FAKE2_LOCALE, region: FAKE_LOCALE },
        expectedMinFormat: { ...expectedMinFormat, name: FAKE2_LOCALE, region: FAKE_LOCALE },
      },
      { action: 'delete', data: {} },
    ]));
});
