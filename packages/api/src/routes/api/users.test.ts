/**
 * JEST Test: /api/user-admin routes
 *
 */

import { LOCALE } from '@argonne/common';

import {
  expectedDateFormat,
  expectedIdFormat,
  expectedRemark,
  expectedUserFormat,
  FAKE,
  FAKE2,
  genUser,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
} from '../../jest';
import School from '../../models/school';
import Tenant from '../../models/tenant';
import type { Id, UserDocument } from '../../models/user';
import User from '../../models/user';
import { schoolYear } from '../../utils/helper';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;

const { createUpdateDelete, getMany } = commonTest;
const route = 'users';

// Top level of this test suite:
describe('User API Routes', () => {
  let adminUser: (UserDocument & Id) | null;
  let normalUser: (UserDocument & Id) | null;
  let rootUser: (UserDocument & Id) | null;
  let tenantAdmin: (UserDocument & Id) | null;
  let tenantId: string | null;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expectedUserFormat.flags,
    tenants: expectedUserFormat.tenants,
    status: expect.any(String), // could be DELETED
    name: expectedUserFormat.name,
    emails: expectedUserFormat.emails,
    studentIds: expectedUserFormat.studentIds,
    schoolHistories: expectedUserFormat.schoolHistories,
    features: expectedUserFormat.features,
    violations: expectedUserFormat.violations,

    remarks: expect.any(Array),
    createdAt: expectedUserFormat.createdAt,
    updatedAt: expectedUserFormat.updatedAt,
  };

  beforeAll(async () => {
    ({ adminUser, normalUser, rootUser, tenantAdmin, tenantId } = await jestSetup([
      'admin',
      'normal',
      'root',
      'tenantAdmin',
    ]));
  });

  afterAll(jestTeardown);

  const createUser = async (tenantId: string | null) => {
    const user = genUser(tenantId);
    await user.save();
    return { user: user.toObject(), id: user._id.toString() };
  };

  test('should pass when getMany & getById (by ROOT)', async () =>
    getMany(route, { 'Jest-User': rootUser!._id }, expectedFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should pass when getMany & getById (by TenantAdmin)', async () =>
    getMany(
      route,
      { 'Jest-User': tenantAdmin!._id },
      { ...expectedFormat, tenants: expect.arrayContaining([tenantId!]) },
      { testGetById: true, testInvalidId: true, testNonExistingId: true },
    ));

  test('should pass when getMany & getById (by non-school tenantAdmin', async () => {
    const nonSchoolTenant = await Tenant.findOne({ school: { $exists: false } }).lean();
    if (!nonSchoolTenant) throw 'Non-school tenant is required to proceed';

    const admin = genUser(nonSchoolTenant._id);
    await Promise.all([
      admin.save(),
      Tenant.findByIdAndUpdate(nonSchoolTenant._id, { $addToSet: { admins: admin._id } }).lean(),
    ]);

    const expectedFormatEx = {
      ...expectedFormat,
      studentIds: [],
      tenants: [nonSchoolTenant!._id.toString()],
      remarks: [],
      violations: [],
    }; // studentId is hidden, show one tenantId

    await getMany(route, { 'Jest-User': admin!._id }, expectedFormatEx, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });

    // clean up
    await Promise.all([
      User.deleteOne({ _id: admin._id }),
      Tenant.findByIdAndUpdate(nonSchoolTenant._id, { $pull: { admins: admin._id } }).lean(),
    ]);
  });

  test('should fail when normalUser try to create user', async () => {
    const { emails, name } = genUser(null);

    await createUpdateDelete(route, { 'Jest-User': normalUser!._id }, [
      {
        action: 'create',
        data: { tenantId: tenantId, email: emails[0], name },
        expectedResponse: {
          statusCode: 403,
          data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
        },
      },
    ]);
  });

  test('should fail when admin try to create user', async () => {
    const { emails, name } = genUser(null);

    await createUpdateDelete(route, { 'Jest-User': adminUser!._id }, [
      {
        action: 'create',
        data: { tenantId: tenantId, email: emails[0], name },
        expectedResponse: {
          statusCode: 403,
          data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
        },
      },
    ]);
  });

  test('should fail when root try to create user', async () => {
    const { emails, name } = genUser(null);

    await createUpdateDelete(route, { 'Jest-User': rootUser!._id }, [
      {
        action: 'create',
        data: { tenantId: tenantId, email: emails[0], name },
        expectedResponse: {
          statusCode: 403,
          data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
        },
      },
    ]);
  });

  test('should pass when school tenantAdmin creates user', async () => {
    const { emails, name } = genUser(null);
    const create = { tenantId, email: emails[0]!, name, ...(prob(0.5) && { studentId: FAKE }) };

    const user = await createUpdateDelete<UserDocument & Id>(route, { 'Jest-User': tenantAdmin!._id }, [
      {
        action: 'create',
        data: create,
        expectedMinFormat: {
          ...expectedFormat,
          flags: [USER.FLAG.REQUIRE_PASSWORD_CHANGE],
          tenants: [tenantId!],
          name,
          emails: [emails[0]!.toUpperCase()], // upper-case for unverified email
          ...(create.studentId && { studentIds: [`${tenantId}#${FAKE}`] }),
        }, // email is unverified
      },
    ]);

    // clean up
    await User.deleteOne({ _id: user!._id });
  });

  test('should fail when school tenantAdmin creates an existing user (who NOT in tenant)', async () => {
    const { user } = await createUser(null); // create a new user (without tenants)

    await createUpdateDelete<UserDocument & Id>(route, { 'Jest-User': tenantAdmin!._id }, [
      {
        action: 'create',
        data: { tenantId: tenantId, email: user.emails[0], name: FAKE },
        expectedResponse: {
          statusCode: 400,
          data: { type: 'plain', statusCode: 400, errors: [{ code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED }] },
        },
      },
    ]);

    // clean up
    await User.deleteOne({ _id: user });
  });

  test('should pass when school tenantAdmin creates an existing user (who already in tenant)', async () => {
    const user = await createUpdateDelete<UserDocument & Id>(route, { 'Jest-User': tenantAdmin!._id }, [
      {
        action: 'create',
        data: { tenantId: tenantId, email: normalUser!.emails[0], name: 'whatever' },
        expectedMinFormat: expectedFormat,
      },
    ]);

    // clean up
    await User.deleteOne({ _id: user!._id });
  });

  test('should pass when change password (as root)', async () => {
    expect.assertions(4);

    const { id } = await createUser(tenantId);
    const password = User.genValidPassword();

    // CHANGE_USER_PASSWORD (by ROOT)
    await createUpdateDelete(
      route,
      { 'Jest-User': tenantAdmin!._id },
      [
        {
          action: 'changePassword',
          data: { password },
          expectedResponse: { statusCode: 200, data: { code: MSG_ENUM.COMPLETED } },
        },
      ],
      { overrideId: id, skipAssertion: true },
    );
    const updatedUser = await User.findById(id).lean();
    expect(updatedUser!.flags).toEqual([USER.FLAG.REQUIRE_PASSWORD_CHANGE]);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when change password (as root & tenantAdmin)', async () => {
    expect.assertions(4);

    const { id } = await createUser(tenantId);
    const password = User.genValidPassword();

    // CHANGE_USER_PASSWORD (by tenantAdmin)
    await createUpdateDelete(
      route,
      { 'Jest-User': tenantAdmin!._id },
      [
        {
          action: 'changePassword',
          data: { password },
          expectedResponse: { statusCode: 200, data: { code: MSG_ENUM.COMPLETED } },
        },
      ],
      { overrideId: id, skipAssertion: true },
    );
    const updatedUser = await User.findById(id).lean();
    expect(updatedUser!.flags).toEqual([USER.FLAG.REQUIRE_PASSWORD_CHANGE]);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add & remove feature', async () => {
    const { id } = await createUser(tenantId);

    const feature = randomItem(Object.keys(USER.FEATURE));
    await createUpdateDelete<UserDocument & Id>(
      route,
      { 'Jest-User': rootUser!._id },
      [
        { action: 'addFeature', data: { feature }, expectedMinFormat: { ...expectedFormat, features: [feature] } },
        { action: 'removeFeature', data: { feature }, expectedMinFormat: { ...expectedFormat, features: [] } },
        {
          headers: { 'Jest-User': tenantAdmin!._id },
          action: 'addFeature',
          data: { feature },
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT }] },
          },
        },
        {
          headers: { 'Jest-User': tenantAdmin!._id },
          action: 'removeFeature',
          data: { feature },
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT }] },
          },
        },
      ],
      { overrideId: id },
    );

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add remark', async () => {
    const { id } = await createUser(tenantId);

    await createUpdateDelete<UserDocument & Id>(
      route,
      { 'Jest-User': rootUser!._id },
      [
        {
          action: 'addRemark',
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedFormat, ...expectedRemark(rootUser!._id, FAKE) },
        },
        {
          headers: { 'Jest-User': tenantAdmin!._id },
          action: 'addRemark',
          data: { remark: FAKE2 },
          expectedMinFormat: {
            ...expectedFormat,
            remarks: [
              { t: expectedDateFormat(), u: rootUser!._id.toString(), m: FAKE }, // added by root
              { t: expectedDateFormat(), u: tenantAdmin!._id.toString(), m: FAKE2 }, // added by tenantAdmin
            ],
          },
        },
      ],
      { overrideId: id },
    );

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when set & clear flag', async () => {
    const { id } = await createUser(tenantId);

    const flag = USER.FLAG.DEMO;
    await createUpdateDelete<UserDocument & Id>(
      route,
      { 'Jest-User': rootUser!._id },
      [
        { action: 'setFlag', data: { flag }, expectedMinFormat: { ...expectedFormat, flags: [flag] } },
        { action: 'clearFlag', data: { flag }, expectedMinFormat: { ...expectedFormat, flags: [] } },
        {
          headers: { 'Jest-User': tenantAdmin!._id },
          action: 'setFlag',
          data: { flag },
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT }] },
          },
        },
        {
          headers: { 'Jest-User': tenantAdmin!._id },
          action: 'clearFlag',
          data: { flag },
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT }] },
          },
        },
      ],
      { overrideId: id },
    );

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add schoolHistory', async () => {
    const { id } = await createUser(tenantId);

    const tenant = await Tenant.findById(tenantId!).lean();
    const school = await School.findById(tenant!.school).lean();
    const schoolId = school!._id.toString();

    const history = { year: schoolYear(), level: randomItem(school!.levels).toString() };
    const history2 = { year: schoolYear(1), level: randomItem(school!.levels).toString(), schoolClass: '1X' };

    await createUpdateDelete<UserDocument & Id>(
      route,
      { 'Jest-User': tenantAdmin!._id },
      [
        {
          action: 'addSchoolHistory',
          data: history,
          expectedMinFormat: {
            ...expectedFormat,
            schoolHistories: [
              expect.objectContaining({ school: schoolId, ...history, updatedAt: expectedDateFormat() }),
            ],
          },
        },
        {
          action: 'addSchoolHistory',
          data: history2,
          expectedMinFormat: {
            ...expectedFormat,
            schoolHistories: [
              expect.objectContaining({ school: schoolId, ...history2, updatedAt: expectedDateFormat() }),
              expect.objectContaining({ school: schoolId, ...history, updatedAt: expectedDateFormat() }),
            ],
          },
        },
        {
          headers: { 'Jest-User': rootUser!._id },
          action: 'addSchoolHistory',
          data: history,
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
          },
        },
      ],
      { overrideId: id },
    );

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when suspend user', async () => {
    const { id } = await createUser(tenantId);

    await createUpdateDelete<UserDocument & Id>(
      route,
      { 'Jest-User': rootUser!._id },
      [
        {
          action: 'suspend',
          data: {},
          expectedMinFormat: { ...expectedFormat, suspendUtil: expectedDateFormat() },
        },
        {
          headers: { 'Jest-User': tenantAdmin!._id },
          action: 'suspend',
          data: {},
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT }] },
          },
        },
      ],
      { overrideId: id },
    );

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when updateIdentifiedAt', async () => {
    const { id } = await createUser(tenantId);

    await createUpdateDelete<UserDocument & Id>(
      route,
      { 'Jest-User': rootUser!._id },
      [
        {
          action: 'updateIdentifiedAt',
          data: {},
          expectedMinFormat: { ...expectedFormat, identifiedAt: expectedDateFormat() },
        },
        {
          headers: { 'Jest-User': tenantAdmin!._id },
          action: 'updateIdentifiedAt',
          data: {},
          expectedResponse: {
            statusCode: 403,
            data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT }] },
          },
        },
      ],
      { overrideId: id },
    );

    // clean up
    await User.deleteOne({ _id: id });
  });
});
