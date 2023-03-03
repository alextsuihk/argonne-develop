/**
 * Jest: /resolvers/tenant
 *
 * ! note: JestUser2 is jestTenant's admin
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  apolloExpect,
  ApolloServer,
  domain,
  expectedIdFormat,
  expectedLocaleFormat,
  expectedRemark,
  FAKE,
  FAKE_LOCALE,
  FAKE2,
  FAKE2_LOCALE,
  idsToString,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
  shuffle,
  testServer,
} from '../jest';
import School from '../models/school';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_TENANT,
  ADD_TENANT_REMARK,
  BIND_TENANT,
  GET_TENANT_TOKEN,
  GET_TENANTS,
  REMOVE_TENANT,
  SEND_TEST_EMAIL,
  UNBIND_TENANT,
  UPDATE_TENANT_CORE,
  UPDATE_TENANT_EXTRA,
} from '../queries/tenant';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;

// Top tenant of this test suite:
describe('Tenant GraphQL', () => {
  let guestServer: ApolloServer | null;
  let rootServer: ApolloServer | null;
  let rootUser: LeanDocument<UserDocument> | null;
  let normalServer: ApolloServer | null;
  let normalUser: LeanDocument<UserDocument> | null;
  let tenantId: string | null;
  let htmlUrl: string;
  let htmlUrl2: string;
  let logoUrl: string;
  let logoUrl2: string;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    code: expect.any(String),
    name: expectedLocaleFormat,
    school: expect.toBeOneOf([null, expect.any(String)]),

    admins: expect.any(Array),
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

    remarks: null,

    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  const expectedRootFormat = {
    ...expectedNormalFormat,
    remarks: expect.any(Array), // could be empty array without any remarks
  };

  beforeAll(async () => {
    ({ guestServer, normalServer, normalUser, rootServer, rootUser, tenantId } = await jestSetup(
      ['guest', 'normal', 'root'],
      { apollo: true },
    ));
  });
  afterAll(async () =>
    Promise.all([
      jestRemoveObject(htmlUrl),
      jestRemoveObject(htmlUrl2),
      jestRemoveObject(logoUrl),
      jestRemoveObject(logoUrl2),
      jestTeardown(),
    ]),
  );

  test('should response a tenant list as guest user', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_TENANTS });
    apolloExpect(res, 'data', { tenants: expect.arrayContaining([expectedNormalFormat]) });
  });

  test('should fail when non tenantAdmin trying to generate token', async () => {
    expect.assertions(2);

    const operation = { query: GET_TENANT_TOKEN, variables: { id: tenantId } };

    const res1 = await guestServer!.executeOperation(operation);
    apolloExpect(res1, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const res2 = await normalServer!.executeOperation(operation);
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should pass when ADD, ADD_REMARK, ....,  UPDATE, BIND, UNBIND, REMOVE', async () => {
    expect.assertions(13 + 2);

    const schools = await School.find({ deletedAt: { $exists: false } }).lean();

    const tenantCore = {
      code: FAKE.toUpperCase(),
      name: FAKE_LOCALE,
      ...(prob(0.5) && { school: randomId(schools) }),
      services: Object.keys(TENANT.SERVICE)
        .sort(shuffle)
        .slice(0, 3 * Math.random() + 1),
      ...(prob(0.5) && { satelliteUrl: `https://satellite.${domain}` }),
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
      addTenantRemark: { ...expectedRootFormat, ...expectedRemark(rootUser!, FAKE, true) },
    });

    // not allow to change code
    const updateCodeRes = await rootServer!.executeOperation({
      query: UPDATE_TENANT_CORE,
      variables: { id: newId, tenant: { ...tenantCore, code: 'NOT-ALLOWED-TO-CHANGE' } },
    });
    apolloExpect(updateCodeRes, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // update core (as root)
    const tenantCoreUpdate = {
      code: FAKE.toUpperCase(),
      name: FAKE2_LOCALE,
      ...(prob(0.5) && { school: randomId(schools) }),
      services: Object.keys(TENANT.SERVICE)
        .sort(shuffle)
        .slice(0, 3 * Math.random() + 1),
      ...(prob(0.5) && { satelliteUrl: `https://satellite2.${domain}` }),
    };
    const updateCoreRes = await rootServer!.executeOperation({
      query: UPDATE_TENANT_CORE,
      variables: { id: newId, tenant: tenantCoreUpdate },
    });
    apolloExpect(updateCoreRes, 'data', { updateTenantCore: { ...expectedRootFormat, ...tenantCoreUpdate } });

    // create two fake users
    const users = Array(2)
      .fill(0)
      .map(
        (_, idx) =>
          new User<Partial<UserDocument>>({
            name: `tenantAdmin (${idx})`,
            emails: [`tenant-admin-${idx}@${newId}.net`],
            password: User.genValidPassword(),
            tenants: [newId],
          }),
      );
    await User.create(users);

    // add one admin; and update website, htmlUrl, logoUrl
    [htmlUrl, logoUrl] = await Promise.all([jestPutObject(rootUser!), jestPutObject(rootUser!)]);

    const tenantExtra = {
      admins: idsToString(users),
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
      admins: idsToString(users),
      supports: [randomId(users)],
      counselors: [randomId(users)],
      marshals: [randomId(users)],
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
    [htmlUrl2, logoUrl2] = await Promise.all([jestPutObject(rootUser!), jestPutObject(rootUser!)]);
    const updateExtraRes3 = await rootServer!.executeOperation({
      query: UPDATE_TENANT_EXTRA,
      variables: { id: newId, tenant: { ...tenantExtra2, htmlUrl: htmlUrl2, logoUrl: logoUrl2 } },
    });
    apolloExpect(updateExtraRes3, 'data', {
      updateTenantExtra: { ...expectedRootFormat, ...tenantExtra2, htmlUrl: htmlUrl2, logoUrl: logoUrl2 },
    });

    // send test-mail (as tenantAdmin)
    const testEmailRes = await tenantAdminServer.executeOperation({
      query: SEND_TEST_EMAIL,
      variables: { id: newId, email: users[0].emails[0] },
    });
    apolloExpect(testEmailRes, 'data', { sendTestEmail: { code: MSG_ENUM.COMPLETED } });

    // generate tenantToken (as tenantAdmin)
    const tokenRes = await tenantAdminServer.executeOperation({ query: GET_TENANT_TOKEN, variables: { id: newId } });
    apolloExpect(tokenRes, 'data', { tenantToken: { token: expect.any(String), expireAt: expect.any(Number) } });

    // bind tenant (as normalUser)
    const bindRes = await normalServer!.executeOperation({
      query: BIND_TENANT,
      variables: { token: tokenRes.data!.tenantToken!.token },
    });
    apolloExpect(bindRes, 'data', { bindTenant: { code: MSG_ENUM.COMPLETED } });

    // check userTenants after binding (as normalUser)
    const user = await User.findOneActive({ _id: normalUser!._id });
    expect(idsToString(user!.tenants).includes(newId)).toBeTrue();

    // unbind tenant (as adminUser)
    const unbindRes = await tenantAdminServer.executeOperation({
      query: UNBIND_TENANT,
      variables: { id: newId, userId: normalUser!._id.toString() },
    });
    apolloExpect(unbindRes, 'data', { unbindTenant: { code: MSG_ENUM.COMPLETED } });

    // check userTenants after unbinding (as normalUser)
    const unboundUser = await User.findOneActive({ _id: normalUser!._id });
    expect(idsToString(unboundUser!.tenants).includes(newId)).toBeFalse();

    // remove tenant (as root)
    const removedRes = await rootServer!.executeOperation({
      query: REMOVE_TENANT,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeTenant: { code: MSG_ENUM.COMPLETED } });
  });
});
