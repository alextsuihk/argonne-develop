/**
 * JEST Test: /api/subjects routes
 *
 */

import {
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2_LOCALE,
  idsToString,
  jestSetup,
  jestTeardown,
  shuffle,
} from '../../jest';
import type { LevelDocument } from '../../models/level';
import Level from '../../models/level';
import type { SubjectDocument } from '../../models/subject';
import type { Id, UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany } = commonTest;

// Top level of this test suite:
describe('Subject API Routes', () => {
  const route = 'subjects';

  let adminUser: (UserDocument & Id) | null;
  let levels: (LevelDocument & Id)[] = [];

  // expected MINIMUM single subject format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    levels: expect.arrayContaining([expect.any(String)]),
  };

  beforeAll(async () => {
    [{ adminUser }, levels] = await Promise.all([
      jestSetup(['admin']),
      Level.find({ deleted: { $exists: false } }).lean(),
    ]);
  });
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () =>
    createUpdateDelete<SubjectDocument>(
      route,
      { 'Jest-User': adminUser!._id },

      [
        {
          action: 'create',
          data: { name: FAKE_LOCALE, levels: idsToString(levels.sort(shuffle).slice(0, 3)) },
          expectedMinFormat: { ...expectedMinFormat, name: FAKE_LOCALE },
        },
        {
          action: 'addRemark',
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(adminUser!._id, FAKE) },
        },
        {
          action: 'update',
          data: { name: FAKE2_LOCALE, levels: idsToString(levels.sort(shuffle).slice(0, 3)) },
          expectedMinFormat: { ...expectedMinFormat, name: FAKE2_LOCALE },
        },
        { action: 'delete', data: {} },
      ],
    ));
});
