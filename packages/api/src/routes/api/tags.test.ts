/**
 * JEST Test: /api/tags routes *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import configLoader from '../../config/config-loader';
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
import type { TagDocument } from '../../models/tag';
import type { Id, UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { createUpdateDelete, getMany } = commonTest;
const { DEFAULTS } = configLoader;
const route = 'tags';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUsers: (UserDocument & Id)[] | null;
  let adminUser: (UserDocument & Id) | null;

  // expected MINIMUM single tag format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    name: expectedLocaleFormat,
    description: expectedLocaleFormat,

    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => {
    ({ adminUser, normalUsers } = await jestSetup(['admin', 'normal']));
  });

  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when CREATE, UPDATE, REMOVE & verify-REMOVE', async () => {
    const fakeLocale = FAKE_LOCALE;
    fakeLocale.enUS = fakeLocale.enUS.toLocaleLowerCase();
    const fake2Locale = FAKE2_LOCALE;
    fake2Locale.enUS = fakeLocale.enUS.toLocaleLowerCase();

    await createUpdateDelete<TagDocument & Id>(
      route,
      { 'Jest-User': adminUser!._id },

      [
        {
          action: 'create',
          data: { name: fakeLocale, description: fake2Locale },
          expectedMinFormat: { ...expectedMinFormat, name: fakeLocale, description: fake2Locale },
        },
        {
          action: 'addRemark',
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(adminUser!._id, FAKE) },
        },
        {
          action: 'update',
          data: { name: fake2Locale, description: fakeLocale },
          expectedMinFormat: { ...expectedMinFormat, name: fake2Locale, description: fakeLocale },
        },
        { action: 'delete', data: {} },
      ],
    );
  });

  test('should fail when accessing (as normal user without sufficient creditability)', async () => {
    expect.assertions(3 + 3 + 3);

    // create without sufficient creditability
    let user = normalUsers!.find(user => user.creditability < DEFAULTS.CREDITABILITY.CREATE_TAG);
    if (!user) throw 'User with sufficient creditability is required';
    let res = await request(app)
      .post('/api/tags')
      .send({ name: FAKE_LOCALE, description: FAKE2_LOCALE })
      .set({ 'Jest-User': user._id });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);

    // create a FAKE tag to play with
    res = await request(app)
      .post('/api/tags')
      .send({ name: FAKE_LOCALE, description: FAKE2_LOCALE })
      .set({ 'Jest-User': adminUser!._id });
    const newId = res.body.data._id;

    // update without sufficient creditability
    user = normalUsers!.find(user => user.creditability < DEFAULTS.CREDITABILITY.UPDATE_TAG);
    if (!user) throw 'User with sufficient creditability is required';
    res = await request(app)
      .patch(`/api/tags/${newId}`)
      .send({ name: FAKE_LOCALE, description: FAKE2_LOCALE })
      .set({ 'Jest-User': user._id });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);

    // remove without sufficient creditability
    user = normalUsers!.find(user => user.creditability < DEFAULTS.CREDITABILITY.REMOVE_TAG);
    if (!user) throw 'User with sufficient creditability is required';
    res = await request(app).delete(`/api/tags/${newId}`).set({ 'Jest-User': user._id });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);

    // clean-up
    await request(app).delete(`/api/tags/${newId}`).set({ 'Jest-User': adminUser!._id });
  });
});
