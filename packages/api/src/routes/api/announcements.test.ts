/**
 * JEST Test: /api/announcements routes
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import { expectedDateFormat, expectedIdFormat, FAKE, jestSetup, jestTeardown } from '../../jest';
import type { AnnouncementDocument } from '../../models/announcement';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { createUpdateDelete, getMany, getUnauthenticated } = commonTest;
const route = 'announcements';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single announcement format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    title: expect.any(String),
    message: expect.any(String),
    beginAt: expectedDateFormat(),
    endAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, { 'Jest-User': jest.normalUser._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should fail when accessing as guest', async () => getUnauthenticated(route, {}));

  test('should pass when CREATE, REMOVE & verify-REMOVE (as admin)', async () =>
    createUpdateDelete<AnnouncementDocument>(route, { 'Jest-User': jest.adminUser._id }, [
      {
        action: 'create',
        data: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) },
        expectedMinFormat: { ...expectedMinFormat, title: FAKE, message: FAKE },
      },
      { action: 'delete', data: {} },
    ]));

  test('should pass when CREATE, REMOVE & verify-REMOVE (as tenantAdmin)', async () =>
    createUpdateDelete<AnnouncementDocument>(route, { 'Jest-User': jest.tenantAdmin._id }, [
      {
        action: 'create',
        data: {
          tenantId: jest.tenantId,
          title: FAKE,
          message: FAKE,
          beginAt: addDays(Date.now(), 5),
          endAt: addDays(Date.now(), 15),
        },
        expectedMinFormat: { ...expectedMinFormat, tenant: jest.tenantId, title: FAKE, message: FAKE },
      },
      { action: 'delete', data: {} },
    ]));

  test('should fail when CREATE without tenantId (as tenantAdmin)', async () =>
    createUpdateDelete<AnnouncementDocument>(route, { 'Jest-User': jest.tenantAdmin._id }, [
      {
        action: 'create',
        data: { title: FAKE, message: FAKE, beginAt: addDays(Date.now(), 5), endAt: addDays(Date.now(), 15) },
        expectedResponse: {
          statusCode: 403,
          data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
        },
      },
    ]));
});
