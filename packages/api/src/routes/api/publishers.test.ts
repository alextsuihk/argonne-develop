/**
 * JEST Test: /api/publishers routes
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
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
} from '../../jest';
import type { PublisherDocument } from '../../models/publisher';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany } = commonTest;
const route = 'publishers';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single publisher format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    admins: expect.any(Array),
    phones: expect.any(Array),

    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () => {
    const [url, url2] = await Promise.all([jestPutObject(jest.adminUser._id), jestPutObject(jest.adminUser._id)]);
    const create = {
      admins: [jest.adminUser._id.toString(), jest.normalUser._id.toString()],
      name: FAKE_LOCALE,
      phones: ['+852 12345678'],
      ...(prob(0.5) && { website: 'http://jest.com' }),
      ...(prob(0.5) && { logoUrl: url }),
    };

    const update = {
      admins: [jest.adminUser._id.toString()],
      name: FAKE2_LOCALE,
      phones: ['+852 12345678'],
      website: 'http://jest2.com',
    };

    await createUpdateDelete<PublisherDocument>(route, { 'Jest-User': jest.adminUser._id }, [
      { action: 'create', data: create, expectedMinFormat: { ...expectedMinFormat, ...create } },
      {
        action: 'addRemark',
        data: { remark: FAKE },
        expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(jest.adminUser._id, FAKE) },
      },
      { action: 'update', data: { ...update, logoUrl: '' }, expectedMinFormat: { ...expectedMinFormat, ...update } }, // remove logoUrl
      {
        action: 'update', // add logoUrl back
        data: { ...update, logoUrl: url2 },
        expectedMinFormat: { ...expectedMinFormat, ...update, logoUrl: url2 },
      },
      { action: 'delete', data: {} },
    ]);

    // clean up
    await Promise.all([jestRemoveObject(url), jestRemoveObject(url2)]);
  });
});
