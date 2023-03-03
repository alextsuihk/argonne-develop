/**
 * JEST Test: /api/publishers routes
 *
 */

import type { LeanDocument } from 'mongoose';

import {
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2_LOCALE,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
} from '../../jest';
import type { PublisherDocument } from '../../models/publisher';
import type { UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany } = commonTest;
const route = 'publishers';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let adminUser: LeanDocument<UserDocument> | null;
  let normalUser: LeanDocument<UserDocument> | null;
  let url: string;
  let url2: string;

  // expected MINIMUM single publisher format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    admins: expect.any(Array),
    phones: expect.any(Array),
  };

  beforeAll(async () => {
    ({ adminUser, normalUser } = await jestSetup(['admin', 'normal']));
  });
  afterAll(async () => Promise.all([jestRemoveObject(url), jestRemoveObject(url2), jestTeardown()]));

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () => {
    [url, url2] = await Promise.all([jestPutObject(adminUser!), jestPutObject(adminUser!)]);
    const create = {
      admins: [adminUser!._id.toString(), normalUser!._id.toString()],
      name: FAKE_LOCALE,
      phones: ['+852 12345678'],
      ...(prob(0.5) && { website: 'http://jest.com' }),
      ...(prob(0.5) && { logoUrl: url }),
    };

    const update = {
      admins: [adminUser!._id.toString()],
      name: FAKE2_LOCALE,
      phones: ['+852 12345678'],
      website: 'http://jest2.com',
    };

    await createUpdateDelete<PublisherDocument>(route, { 'Jest-User': adminUser!._id }, [
      { action: 'create', data: create, expectedMinFormat: { ...expectedMinFormat, ...create } },
      {
        action: 'addRemark',
        data: { remark: FAKE },
        expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(adminUser!, FAKE) },
      },
      { action: 'update', data: { ...update, logoUrl: '' }, expectedMinFormat: { ...expectedMinFormat, ...update } }, // remove logoUrl
      {
        action: 'update', // add logoUrl back
        data: { ...update, logoUrl: url2 },
        expectedMinFormat: { ...expectedMinFormat, ...update, logoUrl: url2 },
      },
      { action: 'delete', data: {} },
    ]);
  });
});
