/**
 * JEST Test: /api/levels routes
 *
 */

import { LOCALE } from '@argonne/common';

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
import type { LevelDocument } from '../../models/level';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { createUpdateDelete, getMany } = commonTest;
const route = 'levels';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single level format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () =>
    createUpdateDelete<LevelDocument>(route, { 'Jest-User': jest.adminUser._id }, [
      {
        action: 'create',
        data: { code: FAKE, name: FAKE_LOCALE },
        expectedMinFormat: { ...expectedMinFormat, code: FAKE.toUpperCase(), name: FAKE_LOCALE },
      },
      {
        action: 'addRemark',
        data: { remark: FAKE },
        expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(jest.adminUser._id, FAKE) },
      },
      {
        action: 'update',
        data: { code: 'NOT-ALLOWED-TO-CHANGE', name: FAKE2_LOCALE },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
        },
      },
      {
        action: 'update',
        data: { code: FAKE, name: FAKE2_LOCALE },
        expectedMinFormat: { ...expectedMinFormat, code: FAKE.toUpperCase(), name: FAKE2_LOCALE },
      },
      { action: 'delete', data: {} },
    ]));
});
