/**
 * Jest: /resolvers/tenant
 *
 * ! note: JestUser2 is jestTenant's admin
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
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
  testServer,
} from '../jest';
import School from '../models/school';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_TENANT,
  ADD_TENANT_REMARK,
  GET_TENANTS,
  REMOVE_TENANT,
  SEND_TEST_EMAIL,
  UPDATE_TENANT_CORE,
  UPDATE_TENANT_EXTRA,
} from '../queries/tenant';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;

// Top tenant of this test suite:
describe('Tenant GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: UserDocument | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let rootServer: ApolloServer | null;
  let rootUser: UserDocument | null;
  let tenantAdmin: UserDocument | null;
  let tenantAdminServer: ApolloServer | null;

  let htmlUrl: string;
  let htmlUrl2: string;
  let logoUrl: string;
  let logoUrl2: string;

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

    remarks: null,

    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  const expectedRootFormat = {
    ...expectedNormalFormat,
    remarks: expect.any(Array), // could be empty array without any remarks
  };

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer, rootServer, rootUser, tenantAdmin, tenantAdminServer } =
      await jestSetup(['admin', 'guest', 'normal', 'root', 'tenantAdmin'], { apollo: true }));
  });
  afterAll(async () =>
    Promise.all([
      htmlUrl && jestRemoveObject(htmlUrl),
      htmlUrl2 && jestRemoveObject(htmlUrl2),
      logoUrl && jestRemoveObject(logoUrl),
      logoUrl2 && jestRemoveObject(logoUrl2),
      jestTeardown(),
    ]),
  );

  test('should response a tenant list as guest user', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_TENANTS });
    apolloExpect(res, 'data', { tenants: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should fail when sending a test email (without email or wrong email)', async () => {
    expect.assertions(2);

    // without email
    const res1 = await normalServer!.executeOperation({ query: SEND_TEST_EMAIL });
    apolloExpect(res1, 'errorContaining', 'Variable "$email" of required type "String!" was not provided');

    // with wrong email
    const email = 'wrong@email.com';
    const res2 = await normalServer!.executeOperation({ query: SEND_TEST_EMAIL, variables: { email } });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should pass when sending a test email (as tenantAdmin)', async () => {
    expect.assertions(1);

    const [email] = tenantAdmin!.emails;
    const res = await tenantAdminServer!.executeOperation({ query: SEND_TEST_EMAIL, variables: { email } });
    apolloExpect(res, 'data', { sendTestEmail: { code: MSG_ENUM.COMPLETED } });
  });

  test('should pass when sending a test email (as admin)', async () => {
    expect.assertions(1);

    const [email] = adminUser!.emails;
    const res = await adminServer!.executeOperation({ query: SEND_TEST_EMAIL, variables: { email } });
    apolloExpect(res, 'data', { sendTestEmail: { code: MSG_ENUM.COMPLETED } });
  });

  test('should pass when ADD, ADD_REMARK, ....,  UPDATE, REMOVE', async () => {
    expect.assertions(9);

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
    const createdRes = await rootServer!.executeOperation({
      query: ADD_TENANT,
      variables: { tenant: { ...tenantCore, code: FAKE.toLowerCase() } }, // test with lower case code
    });
    apolloExpect(createdRes, 'data', { addTenant: { ...expectedRootFormat, ...tenantCore } });
    const newId: string = createdRes.data!.addTenant._id.toString();

    // add remark
    const addRemarkRes = await rootServer!.executeOperation({
      query: ADD_TENANT_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addTenantRemark: { ...expectedRootFormat, ...expectedRemark(rootUser!._id, FAKE, true) },
    });

    // not allow to change code
    const updateCodeRes = await rootServer!.executeOperation({
      query: UPDATE_TENANT_CORE,
      variables: { id: newId, tenant: { ...tenantCore, code: 'NOT-ALLOWED-TO-CHANGE' } },
    });
    apolloExpect(updateCodeRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // update core (as root)
    const tenantCoreUpdate = {
      code,
      name: FAKE2_LOCALE,
      ...(school && { school }),
      services: randomItems(Object.keys(TENANT.SERVICE), 3 * Math.random() + 1),
    };
    const updateCoreRes = await rootServer!.executeOperation({
      query: UPDATE_TENANT_CORE,
      variables: { id: newId, tenant: tenantCoreUpdate },
    });
    apolloExpect(updateCoreRes, 'data', { updateTenantCore: { ...expectedRootFormat, ...tenantCoreUpdate } });

    // create two fake users
    const users = Array(2)
      .fill(0)
      .map((_, idx) => genUser(newId, { name: `tenantAdmin (${idx})` }));
    await User.insertMany(users);

    // add one admin; and update website, htmlUrl, logoUrl
    [htmlUrl, logoUrl] = await Promise.all([jestPutObject(rootUser!._id), jestPutObject(rootUser!._id)]);

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
    const addAdminRes = await rootServer!.executeOperation({
      query: UPDATE_TENANT_EXTRA,
      variables: { id: newId, tenant: tenantExtra },
    });
    apolloExpect(addAdminRes, 'data', { updateTenantExtra: { ...expectedRootFormat, ...tenantExtra } });

    const tenantExtra2 = {
      admins: users.map(u => u._id.toString()),
      supports: [randomItem(users)._id.toString()],
      counselors: [randomItem(users)._id.toString()],
      marshals: [randomItem(users)._id.toString()],
      website: `https://www2.${domain}`,
      flaggedWords: [FAKE, FAKE2],
    };

    // should fail when update extra as normalUser (non tenant.admins)
    const updateExtraFailRes = await normalServer!.executeOperation({
      query: UPDATE_TENANT_EXTRA,
      variables: { id: newId, tenant: tenantExtra2 },
    });
    apolloExpect(updateExtraFailRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // update extra (as tenantAdmin) remove htmlUrl & logoUrl
    const tenantAdminServer = testServer(users[0]);
    const updateExtraRes = await tenantAdminServer.executeOperation({
      query: UPDATE_TENANT_EXTRA,
      variables: { id: newId, tenant: { ...tenantExtra2, htmlUrl: '', logoUrl: '' } },
    });
    apolloExpect(updateExtraRes, 'data', {
      updateTenantExtra: { ...expectedNormalFormat, ...tenantExtra2, htmlUrl: null, logoUrl: null },
    });

    // update extra (as root), update logoUrl & htmlUrl
    [htmlUrl2, logoUrl2] = await Promise.all([jestPutObject(rootUser!._id), jestPutObject(rootUser!._id)]);
    const updateExtraRes3 = await rootServer!.executeOperation({
      query: UPDATE_TENANT_EXTRA,
      variables: { id: newId, tenant: { ...tenantExtra2, htmlUrl: htmlUrl2, logoUrl: logoUrl2 } },
    });
    apolloExpect(updateExtraRes3, 'data', {
      updateTenantExtra: { ...expectedRootFormat, ...tenantExtra2, htmlUrl: htmlUrl2, logoUrl: logoUrl2 },
    });

    // remove tenant (as root)
    const removedRes = await rootServer!.executeOperation({
      query: REMOVE_TENANT,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeTenant: { code: MSG_ENUM.COMPLETED } });
  });
});
