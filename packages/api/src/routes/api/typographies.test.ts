/**
 * JEST Test: /api/typographies routes
 *
 */

import { LOCALE } from '@argonne/common';

import {
  type ConvertObjectIdToString,
  expectedDateFormat,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2,
  FAKE2_LOCALE,
  jestSetup,
  jestTeardown,
} from '../../jest';
import type { TypographyDocument } from '../../models/typography';
import commonTest from './rest-api-test';

type TypographyDocumentEx = Omit<TypographyDocument, 'customs'> & {
  customs: ConvertObjectIdToString<TypographyDocument['customs'][0]>[];
};

const { MSG_ENUM } = LOCALE;

const { createUpdateDelete, getMany } = commonTest;
const route = 'typographies';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single typography format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    key: expect.any(String),
    title: expectedLocaleFormat,
    content: expectedLocaleFormat,
  };

  const expectedAdminFormat = {
    ...expectedMinFormat,
    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById (as guest)', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when getMany & getById (as admin)', async () =>
    getMany(route, { 'Jest-User': jest.adminUser._id }, expectedAdminFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should pass when getMany & getById (as normal user)', async () =>
    getMany(route, { 'Jest-User': jest.normalUser._id }, expectedAdminFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should pass when CREATE, UPDATE,  addCustom, removeCustom, REMOVE & verify-REMOVE', async () =>
    createUpdateDelete<TypographyDocumentEx>(route, { 'Jest-User': jest.adminUser._id }, [
      {
        action: 'create',
        data: { key: FAKE, title: FAKE_LOCALE, content: FAKE2_LOCALE },
        expectedMinFormat: { ...expectedMinFormat, key: FAKE, title: FAKE_LOCALE, content: FAKE2_LOCALE },
      },
      {
        action: 'addRemark',
        data: { remark: FAKE },
        expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(jest.adminUser._id, FAKE) },
      },
      {
        action: 'update',
        data: { key: FAKE2, title: FAKE2_LOCALE, content: FAKE_LOCALE },
        expectedMinFormat: { ...expectedMinFormat, key: FAKE2, title: FAKE2_LOCALE, content: FAKE_LOCALE },
      },
      {
        action: 'addCustom', // by tenantAdmin, without tenantId
        headers: { 'Jest-User': jest.tenantAdmin._id },
        data: { custom: { title: FAKE_LOCALE, content: FAKE_LOCALE } },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'yup', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'tenantId' }] },
        },
      },
      {
        action: 'addCustom',
        headers: { 'Jest-User': jest.tenantAdmin._id },
        data: { tenantId: jest.tenantId, custom: { title: FAKE_LOCALE, content: FAKE_LOCALE } },
        expectedMinFormat: {
          ...expectedMinFormat,
          customs: [{ tenant: jest.tenantId, title: FAKE_LOCALE, content: FAKE_LOCALE }],
        },
      },
      {
        action: 'addCustom',
        headers: { 'Jest-User': jest.tenantAdmin._id },
        data: { tenantId: jest.tenantId, custom: { title: FAKE2_LOCALE, content: FAKE2_LOCALE } },
        expectedMinFormat: {
          ...expectedMinFormat,
          customs: [{ tenant: jest.tenantId, title: FAKE2_LOCALE, content: FAKE2_LOCALE }],
        },
      },
      {
        action: 'removeCustom',
        headers: { 'Jest-User': jest.tenantAdmin._id },
        data: { tenantId: jest.tenantId },
        expectedMinFormat,
      },
      { action: 'delete', data: {} },
    ]));
});
