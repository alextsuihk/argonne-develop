/**
 * JEST Test: /api/tenants routes
 *
 * ! Note: normalUser is jestTenant's admin
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import {
  domain,
  expectedDateFormat,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2,
  FAKE2_LOCALE,
  genUser,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomItems,
} from '../../jest';
import School from '../../models/school';
import { TenantDocument } from '../../models/tenant';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;
const { createUpdateDelete, getMany } = commonTest;
const route = 'tenants';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single tenant format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,

    admins: expect.any(Array), // could be empty array    supports: expect.any(Array), // could be empty array
    counselors: expect.any(Array), // could be empty array
    marshals: expect.any(Array), // could be empty array

    services: expect.arrayContaining([expect.any(String)]),

    // website: expect.any(String),
    // logoUrl: expect.any(String), // could be undefined

    flaggedWords: expect.any(Array),
    authServices: expect.any(Array),

    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response a tenant list as guest user', async () => getMany(route, {}, expectedMinFormat, {}));

  test('should fail when sending a test email (as normalUser)', async () => {
    expect.assertions(3);

    const { _id, emails } = jest.normalUser;
    const res = await request(app)
      .post(`/api/tenants/sendTestEmail`)
      .set({ 'Jest-User': _id })
      .send({ email: emails[0] });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);
  });

  test('should fail when sending a test email (without email or wrong email)', async () => {
    expect.assertions(6);

    const { _id } = jest.adminUser;
    const email = 'wrong@email.com';
    const res1 = await request(app).post(`/api/tenants/sendTestEmail`).set({ 'Jest-User': _id }).send({ email });
    expect(res1.body).toEqual({ errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }], statusCode: 422, type: 'plain' });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(422);

    const res2 = await request(app).post(`/api/tenants/sendTestEmail`).set({ 'Jest-User': _id });
    expect(res2.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'email' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(422);
  });

  test('should pass when sending a test email (as tenantAdmin)', async () => {
    expect.assertions(3);

    const { _id, emails } = jest.tenantAdmin;
    const res = await request(app)
      .post(`/api/tenants/sendTestEmail`)
      .set({ 'Jest-User': _id })
      .send({ email: emails[0] });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should pass when sending a test email (as admin)', async () => {
    expect.assertions(3);

    const { _id, emails } = jest.adminUser;
    const res = await request(app)
      .post(`/api/tenants/sendTestEmail`)
      .set({ 'Jest-User': _id })
      .send({ email: emails[0] });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should pass when ADD, ADD_REMARK, UPDATE, REMOVE', async () => {
    expect.assertions(3 * 4 + 3 * 1 + 3 * 3 + 6 * 1);

    const schools = await School.find({ deletedAt: { $exists: false } }).lean();
    const school = prob(0.5) && randomItem(schools)._id.toString(); // unchangeable
    const code = FAKE.toUpperCase(); // unchangeable

    const tenantCore = {
      code,
      name: FAKE_LOCALE,
      ...(school && { school }),
      services: randomItems(Object.keys(TENANT.SERVICE), Math.random() * 3 + 1),
    };

    const tenantCoreUpdate = {
      code,
      name: FAKE2_LOCALE,
      ...(school && { school }),
      services: randomItems(Object.keys(TENANT.SERVICE), Math.random() * 3 + 1),
    };

    const tenant = await createUpdateDelete<TenantDocument>(
      route,
      { 'Jest-User': jest.rootUser._id }, // as root
      [
        {
          action: 'create',
          data: tenantCore,
          expectedMinFormat: { ...expectedMinFormat, ...tenantCore, code: FAKE.toUpperCase() },
        },
        {
          action: 'addRemark',
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(jest.rootUser._id, FAKE) },
        },
        {
          action: 'updateCore',
          data: { ...tenantCore, code: 'NOT-ALLOWED-TO-CHANGE' },
          expectedResponse: {
            statusCode: 422,
            data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
          },
        },
        {
          action: 'updateCore',
          data: tenantCoreUpdate,
          expectedMinFormat: { ...expectedMinFormat, ...tenantCoreUpdate, code: FAKE.toUpperCase() },
        },
      ],
      { skipAssertion: true },
    );
    const tenantId = tenant!._id.toString();

    const users = Array(2)
      .fill(0)
      .map((_, idx) => genUser(tenant!._id.toString(), { name: `tenantAdmin (${idx})` }));
    await User.insertMany(users);

    await createUpdateDelete<TenantDocument>(
      route,
      { 'Jest-User': jest.rootUser._id }, // add admins as root
      [
        {
          action: 'update',
          data: {
            admins: users.map(user => user._id.toString()),
            supports: [],
            counselors: [],
            marshals: [],
            website: 'https://example.com',
            flaggedWords: [],
          },
          expectedMinFormat: { ...expectedMinFormat, admins: users.map(user => user._id.toString()) },
        },
      ],
      { skipAssertion: true, overrideId: tenantId },
    );

    const tenantExtra = {
      admins: users.map(u => u._id.toString()),
      supports: [randomItem(users)._id.toString()],
      counselors: [randomItem(users)._id.toString()],
      marshals: [randomItem(users)._id.toString()],
      website: `https://www.${domain}`,
      flaggedWords: prob(0.5) ? [] : [FAKE, FAKE2],
    };
    const [htmlUrl, logoUrl, stashUrl] = await Promise.all([
      jestPutObject(users[0]._id),
      jestPutObject(users[0]._id),
      jestPutObject(users[0]._id),
    ]);

    await createUpdateDelete<TenantDocument>(
      route,
      { 'Jest-User': users[0]._id }, // as tenantAdmin
      [
        {
          action: 'update',
          data: { ...tenantExtra, htmlUrl },
          expectedMinFormat: { ...expectedMinFormat, ...tenantExtra, htmlUrl },
        },
        {
          action: 'update',
          data: { ...tenantExtra, htmlUrl: '', logoUrl },
          expectedMinFormat: { ...expectedMinFormat, ...tenantExtra, logoUrl },
        },
        {
          action: 'addStash', // simplified, not test removeStash
          data: { title: FAKE, secret: FAKE2, url: stashUrl },
          expectedMinFormat: {
            ...expectedMinFormat,
            stashes: [{ _id: expectedIdFormat, title: FAKE, secret: FAKE2, url: stashUrl }],
          },
        },
      ],
      { skipAssertion: true, overrideId: tenantId },
    );

    // remove
    await createUpdateDelete<TenantDocument>(
      route,
      { 'Jest-User': jest.rootUser._id }, //
      [{ action: 'delete', data: {} }],
      { skipAssertion: true, overrideId: tenantId },
    );

    // clean up
    await Promise.all([jestRemoveObject(htmlUrl), jestRemoveObject(logoUrl), jestRemoveObject(stashUrl)]);
  });
});
