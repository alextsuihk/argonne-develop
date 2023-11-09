/**
 * Jest: /resolvers/tenant
 *
 * ! note: JestUser2 is jestTenant's admin
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';

import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
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
} from '../jest';
import School from '../models/school';
import type { TenantDocument } from '../models/tenant';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_TENANT,
  ADD_TENANT_REMARK,
  ADD_TENANT_STASH,
  GET_TENANTS,
  REMOVE_TENANT,
  REMOVE_TENANT_STASH,
  SEND_TEST_EMAIL,
  UPDATE_TENANT_CORE,
  UPDATE_TENANT_EXTRA,
} from '../queries/tenant';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;

// Top tenant of this test suite:
describe('Tenant GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    school: expect.toBeOneOf([null, expectedIdFormat]),

    admins: expect.any(Array), // could be empty array
    supports: expect.any(Array), // could be empty array
    counselors: expect.any(Array), // could be empty array
    marshals: expect.any(Array), // could be empty array

    theme: expect.toBeOneOf([null, expect.any(String)]),
    services: expect.arrayContaining([expect.any(String)]),

    htmlUrl: expect.toBeOneOf([null, expect.any(String)]),
    logoUrl: expect.toBeOneOf([null, expect.any(String)]),
    website: expect.toBeOneOf([null, expect.any(String)]),
    satelliteUrl: expect.toBeOneOf([null, expect.any(String)]),

    flaggedWords: expect.any(Array),
    authServices: expect.any(Array),

    satelliteStatus: expect.toBeOneOf([null, expect.any(String)]),
    stashes: expect.any(Array),

    remarks: null,

    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  // for tenantAdmin or root
  const expectedAdminFormat = {
    ...expectedNormalFormat,
    remarks: expect.any(Array), // could be empty array without any remarks
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response a tenant list as guest user', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation({ query: GET_TENANTS }, { contextValue: apolloContext(null) });
    apolloExpect(res, 'data', { tenants: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should fail when sending a test email (without email or wrong email)', async () => {
    expect.assertions(2);

    // without email
    const res1 = await apolloTestServer.executeOperation(
      { query: SEND_TEST_EMAIL },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res1, 'errorContaining', 'Variable "$email" of required type "String!" was not provided');

    // with wrong email
    const email = 'wrong@email.com';
    const res2 = await apolloTestServer.executeOperation(
      { query: SEND_TEST_EMAIL, variables: { email } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should pass when sending a test email (as tenantAdmin)', async () => {
    expect.assertions(1);

    const [email] = jest.tenantAdmin.emails;
    const res = await apolloTestServer.executeOperation(
      { query: SEND_TEST_EMAIL, variables: { email } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(res, 'data', { sendTestEmail: { code: MSG_ENUM.COMPLETED } });
  });

  test('should pass when sending a test email (as admin)', async () => {
    expect.assertions(1);

    const [email] = jest.adminUser.emails;
    const res = await apolloTestServer.executeOperation(
      { query: SEND_TEST_EMAIL, variables: { email } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res, 'data', { sendTestEmail: { code: MSG_ENUM.COMPLETED } });
  });

  test('should pass when ADD, ADD_REMARK, ....,  UPDATE, REMOVE', async () => {
    expect.assertions(11);

    const schools = await School.find({ deletedAt: { $exists: false } }).lean();
    const school = prob(0.5) && randomItem(schools)._id.toString(); // unchangeable
    const code = FAKE.toUpperCase(); // unchangeable

    const tenantCore = {
      code,
      name: FAKE_LOCALE,
      ...(school && { school }),
      services: randomItems(Object.keys(TENANT.SERVICE), 3 * Math.random() + 1),
    };

    // create a new tenant (as root)
    const createdRes = await apolloTestServer.executeOperation<{ addTenant: TenantDocument }>(
      { query: ADD_TENANT, variables: { tenant: { ...tenantCore, code: FAKE.toLowerCase() } } }, // test with lower case code
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(createdRes, 'data', { addTenant: { ...expectedAdminFormat, ...tenantCore } });
    const newId =
      createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addTenant._id.toString() : null;

    // add remark
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_TENANT_REMARK, variables: { id: newId, remark: FAKE } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(addRemarkRes, 'data', {
      addTenantRemark: { ...expectedAdminFormat, ...expectedRemark(jest.rootUser._id, FAKE, true) },
    });

    // not allow to change code
    const updateCodeRes = await apolloTestServer.executeOperation(
      {
        query: UPDATE_TENANT_CORE,
        variables: { id: newId, tenant: { ...tenantCore, code: 'NOT-ALLOWED-TO-CHANGE' } },
      },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(updateCodeRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // update core (as root)
    const tenantCoreUpdate = {
      code,
      name: FAKE2_LOCALE,
      ...(school && { school }),
      services: randomItems(Object.keys(TENANT.SERVICE), 3 * Math.random() + 1),
    };
    const updateCoreRes = await apolloTestServer.executeOperation(
      { query: UPDATE_TENANT_CORE, variables: { id: newId, tenant: tenantCoreUpdate } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(updateCoreRes, 'data', { updateTenantCore: { ...expectedAdminFormat, ...tenantCoreUpdate } });

    // create two fake users (tenantAdmins)
    const users = Array(2)
      .fill(0)
      .map((_, idx) => genUser(newId, { name: `tenantAdmin (${idx})` }));
    await User.insertMany(users);

    // add one admin; and update website, htmlUrl, logoUrl
    const [htmlUrl, logoUrl] = await Promise.all([jestPutObject(jest.rootUser._id), jestPutObject(jest.rootUser._id)]);

    const tenantExtra = {
      admins: users.map(user => user._id.toString()),
      supports: [],
      counselors: [],
      marshals: [],
      htmlUrl,
      logoUrl,
      website: `https://www.${domain}`,
      flaggedWords: [],
    };
    const addAdminRes = await apolloTestServer.executeOperation(
      { query: UPDATE_TENANT_EXTRA, variables: { id: newId, tenant: tenantExtra } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(addAdminRes, 'data', { updateTenantExtra: { ...expectedAdminFormat, ...tenantExtra } });

    const tenantExtra2 = {
      admins: users.map(u => u._id.toString()),
      supports: [randomItem(users)._id.toString()],
      counselors: [randomItem(users)._id.toString()],
      marshals: [randomItem(users)._id.toString()],
      website: `https://www2.${domain}`,
      flaggedWords: [FAKE, FAKE2],
    };

    // should fail when update extra as normalUser (non tenant.admins)
    const updateExtraFailRes = await apolloTestServer.executeOperation(
      { query: UPDATE_TENANT_EXTRA, variables: { id: newId, tenant: tenantExtra2 } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(updateExtraFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // update extra (as tenantAdmin) remove htmlUrl & logoUrl
    const updateExtraRes = await apolloTestServer.executeOperation(
      { query: UPDATE_TENANT_EXTRA, variables: { id: newId, tenant: { ...tenantExtra2, htmlUrl: '', logoUrl: '' } } },
      { contextValue: apolloContext(users[0]) },
    );
    apolloExpect(updateExtraRes, 'data', {
      updateTenantExtra: { ...expectedAdminFormat, ...tenantExtra2, htmlUrl: null, logoUrl: null },
    });

    // update extra (as root), update logoUrl & htmlUrl
    const [htmlUrl2, logoUrl2] = await Promise.all([
      jestPutObject(jest.rootUser._id),
      jestPutObject(jest.rootUser._id),
    ]);
    const updateExtraRes3 = await apolloTestServer.executeOperation(
      {
        query: UPDATE_TENANT_EXTRA,
        variables: { id: newId, tenant: { ...tenantExtra2, htmlUrl: htmlUrl2, logoUrl: logoUrl2 } },
      },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(updateExtraRes3, 'data', {
      updateTenantExtra: { ...expectedAdminFormat, ...tenantExtra2, htmlUrl: htmlUrl2, logoUrl: logoUrl2 },
    });

    // add stash (as tenantAdmin)
    const stashUrl = await jestPutObject(users[0]._id);
    const add = { title: FAKE, secret: FAKE2, url: stashUrl };
    const addStashRes = await apolloTestServer.executeOperation<{ addTenantStash: UserDocument }>(
      { query: ADD_TENANT_STASH, variables: { id: newId, ...add } },
      { contextValue: apolloContext(users[0]) },
    );
    apolloExpect(addStashRes, 'data', {
      addTenantStash: { ...expectedAdminFormat, stashes: [{ _id: expectedIdFormat, ...add }] },
    });

    // remove stash (as tenantAdmin)
    const stashId =
      addStashRes.body.kind === 'single'
        ? addStashRes.body.singleResult.data!.addTenantStash.stashes.at(-1)?._id.toString()
        : null;
    const removeStashRes = await apolloTestServer.executeOperation(
      { query: REMOVE_TENANT_STASH, variables: { id: newId, subId: stashId } },
      { contextValue: apolloContext(users[0]) },
    );
    apolloExpect(removeStashRes, 'data', {
      removeTenantStash: { ...expectedAdminFormat, stashes: [] },
    });

    // remove tenant (as root)
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_TENANT, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(removedRes, 'data', { removeTenant: { code: MSG_ENUM.COMPLETED } });

    // clean up
    await Promise.all([
      jestRemoveObject(htmlUrl),
      jestRemoveObject(htmlUrl2),
      jestRemoveObject(logoUrl),
      jestRemoveObject(logoUrl2),
      jestRemoveObject(stashUrl),
    ]);
  });
});
