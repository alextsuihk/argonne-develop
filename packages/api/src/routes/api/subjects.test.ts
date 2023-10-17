/**
 * JEST Test: /api/subjects routes
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
  randomItems,
} from '../../jest';
import Level from '../../models/level';
import type { SubjectDocument } from '../../models/subject';
import type { UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany } = commonTest;

// Top level of this test suite:
describe('Subject API Routes', () => {
  const route = 'subjects';

  let adminUser: UserDocument | null;

  // expected MINIMUM single subject format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    levels: expect.arrayContaining([expectedIdFormat]),
    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => {
    ({ adminUser } = await jestSetup(['admin']));
  });
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () => {
    const levels = await Level.find({ deletedAt: { $exists: false } }).lean();
    const levelIds = levels.map(level => level._id.toString());

    await createUpdateDelete<SubjectDocument>(
      route,
      { 'Jest-User': adminUser!._id },

      [
        {
          action: 'create',
          data: { name: FAKE_LOCALE, levels: randomItems(levelIds, 3) },
          expectedMinFormat: { ...expectedMinFormat, name: FAKE_LOCALE },
        },
        {
          action: 'addRemark',
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(adminUser!._id, FAKE) },
        },
        {
          action: 'update',
          data: { name: FAKE2_LOCALE, levels: randomItems(levelIds, 3) },
          expectedMinFormat: { ...expectedMinFormat, name: FAKE2_LOCALE },
        },
        { action: 'delete', data: {} },
      ],
    );
  });
});
