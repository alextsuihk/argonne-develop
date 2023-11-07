/**
 * Jest: /resolvers/user
 * ! note: (JEST) tenantAdmin is a school tenantAdmin

 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  apolloContext,
  apolloTestServer,
  expectedDateFormat,
  expectedIdFormat,
  expectedRemark,
  expectedUserFormatApollo as expectedUserFormat,
  FAKE,
  FAKE2,
  genUser,
  jestSetup,
  jestTeardown,
  mongoId,
  prob,
  randomItem,
} from '../jest';
import School from '../models/school';
import type { TenantDocument } from '../models/tenant';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_USER,
  ADD_USER_FEATURE,
  ADD_USER_REMARK,
  ADD_USER_SCHOOL_HISTORY,
  CHANGE_USER_PASSWORD,
  CLEAR_USER_FLAG,
  GET_USER,
  GET_USERS,
  REMOVE_USER_FEATURE,
  SET_USER_FLAG,
  SUSPEND_USER,
  UPDATE_USER_IDENTIFIED_AT,
} from '../queries/user';
import { schoolYear } from '../utils/helper';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;

describe('User GraphQL (token)', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expectedUserFormat.flags,
    tenants: expectedUserFormat.tenants,
    status: expect.any(String), // could be DELETED
    name: expectedUserFormat.name,
    formalName: expectedUserFormat.formalName,
    avatarUrl: expectedUserFormat.avatarUrl,
    emails: expectedUserFormat.emails,
    studentIds: expectedUserFormat.studentIds,
    schoolHistories: expectedUserFormat.schoolHistories,
    features: expectedUserFormat.features,

    violations: expectedUserFormat.violations,
    suspendUtil: expectedUserFormat.suspendUtil,
    identifiedAt: expectedUserFormat.identifiedAt,

    remarks: expect.any(Array),
    createdAt: expectedUserFormat.createdAt,
    updatedAt: expectedUserFormat.updatedAt,
    deletedAt: expectedUserFormat.deletedAt,
  };

  beforeAll(async () => {
    jest = await jestSetup();
    if (!jest.tenant.school) throw 'Tenant must be a school tenant in order to run user.test';
  });
  afterAll(jestTeardown);

  const createUser = async (tenantId: string | null) => {
    const user = genUser(tenantId);
    await user.save();
    return { user: user.toObject(), id: user._id.toString() };
  };

  test('should response an array of data when GET all and Get One (as root)', async () => {
    expect.assertions(2);

    // const variables = { query: { skipDeleted: false } };
    const manyRes = await apolloTestServer.executeOperation<{ users: UserDocument[] }>(
      { query: GET_USERS },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(manyRes, 'data', {
      users: expect.arrayContaining([expectedFormat]),
    });

    const id = manyRes.body.kind === 'single' ? randomItem(manyRes.body.singleResult.data!.users)._id.toString() : null;
    const oneRes = await apolloTestServer.executeOperation(
      { query: GET_USER, variables: { id } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(oneRes, 'data', { user: { ...expectedFormat, _id: id } });
  });

  test('should response an array of data when GET all and Get One (as school tenantAdmin)', async () => {
    expect.assertions(2);

    const manyRes = await apolloTestServer.executeOperation<{ users: UserDocument[] }>(
      { query: GET_USERS },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(manyRes, 'data', {
      users: expect.arrayContaining([{ ...expectedFormat, tenants: expect.arrayContaining([jest.tenantId]) }]),
    });

    const id = manyRes.body.kind === 'single' ? randomItem(manyRes.body.singleResult.data!.users)._id.toString() : null;
    const oneRes = await apolloTestServer.executeOperation(
      { query: GET_USER, variables: { id } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(oneRes, 'data', {
      user: { ...expectedFormat, _id: id, tenants: expect.arrayContaining([jest.tenantId]) },
    });
  });

  test('should response an array of data when GET all and Get One (as non-school tenantAdmin)', async () => {
    expect.assertions(2);

    const nonSchoolTenant = await Tenant.findOne({ school: { $exists: false } }).lean();
    if (!nonSchoolTenant) throw 'Non-school tenant is required to proceed';

    const { user: admin } = await createUser(nonSchoolTenant._id.toString());
    await Tenant.updateOne({ _id: nonSchoolTenant._id }, { $addToSet: { admins: admin._id } });

    const expectedFormatEx = {
      ...expectedFormat,
      studentIds: [],
      tenants: [nonSchoolTenant!._id.toString()],
      remarks: [],
      violations: [],
    }; // studentId is hidden, show one tenantId

    const manyRes = await apolloTestServer.executeOperation<{ users: UserDocument[] }>(
      { query: GET_USERS },
      { contextValue: apolloContext(admin) },
    );
    apolloExpect(manyRes, 'data', { users: expect.arrayContaining([expectedFormatEx]) });

    const id = manyRes.body.kind === 'single' ? randomItem(manyRes.body.singleResult.data!.users)._id.toString() : null;
    const oneRes = await apolloTestServer.executeOperation(
      { query: GET_USER, variables: { id } },
      { contextValue: apolloContext(admin) },
    );
    apolloExpect(oneRes, 'data', { user: { ...expectedFormatEx, _id: id } });

    // clean up
    await Promise.all([
      User.deleteOne({ _id: admin._id }),
      Tenant.findByIdAndUpdate(nonSchoolTenant._id, { $pull: { admins: admin._id } }).lean(),
    ]);
  });

  test('should fail when  GET All or Get One (as guest or normalUser)', async () => {
    expect.assertions(4);
    const manyRes = await apolloTestServer.executeOperation(
      { query: GET_USERS },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(manyRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const oneRes = await apolloTestServer.executeOperation(
      { query: GET_USER, variables: { id: mongoId().toString() } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(oneRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const manyRes2 = await apolloTestServer.executeOperation(
      { query: GET_USERS },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(manyRes2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    const oneRes2 = await apolloTestServer.executeOperation(
      { query: GET_USER, variables: { id: mongoId().toString() } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(oneRes2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should fail when ADD_USER, UPDATE, CHANGE_USER_PASSWORD (as guest or non school tenantAdmin)', async () => {
    expect.assertions(6);

    const nonSchoolTenant = await Tenant.findOne({ school: { $exists: false } }).lean();
    const user = nonSchoolTenant ? await User.findOne({ tenants: nonSchoolTenant._id }).lean() : null;
    if (!nonSchoolTenant || !user) throw 'Non-school tenant & user are required to proceed';

    const { user: admin } = await createUser(nonSchoolTenant._id.toString());
    await Tenant.updateOne({ _id: nonSchoolTenant._id }, { $addToSet: { admins: admin._id } });

    // ADD_USER
    const tenantId = nonSchoolTenant._id.toString();
    const { name, emails } = genUser(null);
    const addRes = await apolloTestServer.executeOperation(
      { query: ADD_USER, variables: { email: emails[0], name } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(addRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const add2Res = await apolloTestServer.executeOperation(
      { query: ADD_USER, variables: { email: emails[0], name, tenantId } },
      { contextValue: apolloContext(admin) },
    );
    apolloExpect(add2Res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // ADD_USER_REMARK
    const id = user._id.toString();
    const updateRes = await apolloTestServer.executeOperation(
      { query: ADD_USER_REMARK, variables: { id, remark: FAKE } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(updateRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const update2Res = await apolloTestServer.executeOperation(
      { query: ADD_USER_REMARK, variables: { id, remark: FAKE } },
      { contextValue: apolloContext(admin) },
    );
    apolloExpect(update2Res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // CHANGE_USER_PASSWORD
    const password = User.genValidPassword();
    const changePasswdRes = await apolloTestServer.executeOperation(
      { query: CHANGE_USER_PASSWORD, variables: { id, password } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(changePasswdRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const changePasswd2Res = await apolloTestServer.executeOperation(
      { query: CHANGE_USER_PASSWORD, variables: { id, password } },
      { contextValue: apolloContext(admin) },
    );
    apolloExpect(changePasswd2Res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // clean up
    await Promise.all([
      User.deleteOne({ _id: admin._id }),
      Tenant.updateOne({ _id: nonSchoolTenant._id }, { $pull: { admins: admin._id } }),
    ]);
  });

  test('should fail when add user (as root)', async () => {
    expect.assertions(1);

    const { name, emails } = genUser(null);
    const email = emails[0]!;

    // add user
    const addRes = await apolloTestServer.executeOperation(
      { query: ADD_USER, variables: { tenantId: jest.tenantId, email, name } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(addRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should pass when add user (as tenantAdmin) ', async () => {
    expect.assertions(1);

    const { name, emails } = genUser(null);

    // ADD_USER by (school) tenantAdmin
    const create = { tenantId: jest.tenantId, email: emails[0]!, name, ...(prob(0.5) && { studentId: FAKE }) };
    const addRes = await apolloTestServer.executeOperation<{ addUser: UserDocument }>(
      { query: ADD_USER, variables: create },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(addRes, 'data', {
      addUser: {
        ...expectedFormat,
        flags: [USER.FLAG.REQUIRE_PASSWORD_CHANGE],
        tenants: [jest.tenantId],
        name,
        emails: [emails[0]!.toUpperCase()], // upper-case for unverified email
        ...(create.studentId && { studentIds: [`${jest.tenantId}#${FAKE}`] }),
      },
    });

    // clean up
    const id = addRes.body.kind === 'single' ? addRes.body.singleResult.data!.addUser._id.toString() : null;
    await User.deleteOne({ _id: id });
  });

  test('should fail when add already existing users (not in tenantId) (as tenantAdmin)', async () => {
    expect.assertions(1);

    const { user } = await createUser(null);

    // ADD_USER
    const addRes = await apolloTestServer.executeOperation(
      { query: ADD_USER, variables: { tenantId: jest.tenantId, email: user.emails[0], name: FAKE } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(addRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED}`);

    // clean up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass when add already existing users (already in tenantId) (as tenantAdmin)', async () => {
    // ADD_USER
    const addRes = await apolloTestServer.executeOperation(
      { query: ADD_USER, variables: { tenantId: jest.tenantId, email: jest.normalUser.emails[0], name: FAKE } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );

    apolloExpect(addRes, 'data', { addUser: { ...expectedFormat, _id: jest.normalUser._id.toString() } });
  });

  test('should pass when change password (as root or tenantAdmin)', async () => {
    expect.assertions(4);

    const { id } = await createUser(jest.tenantId);
    const password = User.genValidPassword();

    // CHANGE_USER_PASSWORD (by ROOT)
    const changePasswordRes = await apolloTestServer.executeOperation(
      { query: CHANGE_USER_PASSWORD, variables: { id, password } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(changePasswordRes, 'data', { changeUserPassword: { code: MSG_ENUM.COMPLETED } });
    let updatedUser = await User.findByIdAndUpdate(id, { $pull: { flags: USER.FLAG.REQUIRE_PASSWORD_CHANGE } }).lean(); // read back & remove flag
    expect(updatedUser!.flags).toEqual([USER.FLAG.REQUIRE_PASSWORD_CHANGE]);

    // CHANGE_USER_PASSWORD (by tenantAdmin)
    const changePassword2Res = await apolloTestServer.executeOperation(
      {
        query: CHANGE_USER_PASSWORD,
        variables: { id, password },
      },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(changePassword2Res, 'data', { changeUserPassword: { code: MSG_ENUM.COMPLETED } });
    updatedUser = await User.findById(id).lean();
    expect(updatedUser!.flags).toEqual([USER.FLAG.REQUIRE_PASSWORD_CHANGE]);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add & remove feature', async () => {
    expect.assertions(4);

    const { id } = await createUser(jest.tenantId);

    // ADD_USER_FEATURE & REMOVE_USER_FEATURE (by ROOT)
    const feature = randomItem(Object.keys(USER.FEATURE));
    const addFeatureRes = await apolloTestServer.executeOperation(
      { query: ADD_USER_FEATURE, variables: { id, feature } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(addFeatureRes, 'data', { addUserFeature: { ...expectedFormat, features: [feature] } });

    const removeFeatureRes = await apolloTestServer.executeOperation(
      { query: REMOVE_USER_FEATURE, variables: { id, feature } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(removeFeatureRes, 'data', { removeUserFeature: { ...expectedFormat, features: [] } });

    // ADD_USER_FEATURE & REMOVE_USER_FEATURE (by tenantAdmin)
    const addFeature2Res = await apolloTestServer.executeOperation(
      { query: ADD_USER_FEATURE, variables: { id, feature } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(addFeature2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    const removeFeature2Res = await apolloTestServer.executeOperation(
      { query: REMOVE_USER_FEATURE, variables: { id, feature } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(removeFeature2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add remark', async () => {
    expect.assertions(2);

    const { id } = await createUser(jest.tenantId);

    // ADD_USER_REMARK (by root)
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_USER_REMARK, variables: { id, remark: FAKE } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(addRemarkRes, 'data', {
      addUserRemark: { ...expectedFormat, ...expectedRemark(jest.rootUser._id, FAKE, true) },
    });

    // ADD_USER_REMARK (by tenantAdmin)
    const addRemark2Res = await apolloTestServer.executeOperation(
      { query: ADD_USER_REMARK, variables: { id, remark: FAKE2 } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(addRemark2Res, 'data', {
      addUserRemark: {
        ...expectedFormat,
        remarks: [
          { t: expectedDateFormat(true), u: jest.rootUser._id.toString(), m: FAKE }, // added by root
          { t: expectedDateFormat(true), u: jest.tenantAdmin._id.toString(), m: FAKE2 }, // added by tenantAdmin
        ],
      },
    });

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when set & clear flag', async () => {
    expect.assertions(4);

    const { id } = await createUser(jest.tenantId);

    // SET_USER_FLAG & REMOVE_USER_FLAG (by ROOT)
    const flag = USER.FLAG.DEMO;
    const setFlagRes = await apolloTestServer.executeOperation(
      {
        query: SET_USER_FLAG,
        variables: { id, flag },
      },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(setFlagRes, 'data', { setUserFlag: { ...expectedFormat, flags: [flag] } });

    const clearFlagRes = await apolloTestServer.executeOperation(
      {
        query: CLEAR_USER_FLAG,
        variables: { id, flag },
      },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(clearFlagRes, 'data', { clearUserFlag: { ...expectedFormat, flags: [] } });

    // SET_USER_FLAG & CLEAR_USER_FLAG (by tenantAdmin)
    const setFlag2Res = await apolloTestServer.executeOperation(
      { query: SET_USER_FLAG, variables: { id, flag } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(setFlag2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    const clearFlag2Res = await apolloTestServer.executeOperation(
      { query: CLEAR_USER_FLAG, variables: { id, flag } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(clearFlag2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add schoolHistory', async () => {
    expect.assertions(3);

    const { id } = await createUser(jest.tenantId);

    const tenant = await Tenant.findById(jest.tenantId).lean();
    const school = await School.findById(tenant!.school).lean();
    const schoolId = school!._id.toString();

    // ADD_USER_SCHOOL_HISTORY (by root)
    const history = { year: schoolYear(), level: randomItem(school!.levels).toString() };
    const addHistoryRes = await apolloTestServer.executeOperation(
      { query: ADD_USER_SCHOOL_HISTORY, variables: { id, ...history } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(addHistoryRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // ADD_USER_SCHOOL_HISTORY (by tenantAdmin)
    const addHistory2Res = await apolloTestServer.executeOperation(
      { query: ADD_USER_SCHOOL_HISTORY, variables: { id, ...history } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(addHistory2Res, 'data', {
      addUserSchoolHistory: {
        ...expectedFormat,
        schoolHistories: [{ school: schoolId, ...history, schoolClass: null, updatedAt: expectedDateFormat(true) }],
      },
    });

    // ADD_USER_SCHOOL_HISTORY (by tenantAdmin) (simulating next year)
    const history2 = { year: schoolYear(1), level: randomItem(school!.levels).toString(), schoolClass: '1X' };
    const addHistory3Res = await apolloTestServer.executeOperation(
      { query: ADD_USER_SCHOOL_HISTORY, variables: { id, ...history2 } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(addHistory3Res, 'data', {
      addUserSchoolHistory: {
        ...expectedFormat,
        schoolHistories: [
          { school: schoolId, ...history2, updatedAt: expectedDateFormat(true) },
          { school: schoolId, ...history, schoolClass: null, updatedAt: expectedDateFormat(true) },
        ],
      },
    });

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when suspend user', async () => {
    expect.assertions(2);

    const { id } = await createUser(jest.tenantId);

    // SUSPEND_USER (by ROOT)
    const suspendRes = await apolloTestServer.executeOperation(
      { query: SUSPEND_USER, variables: { id } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(suspendRes, 'data', { suspendUser: { ...expectedFormat, suspendUtil: expectedDateFormat(true) } });

    // SUSPEND_USER (by tenantAdmin)
    const suspend2Res = await apolloTestServer.executeOperation(
      { query: SUSPEND_USER, variables: { id } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(suspend2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when updateIdentifiedAt', async () => {
    expect.assertions(2);

    const { id } = await createUser(jest.tenantId);

    // UPDATE_USER_IDENTIFIED_AT (by ROOT)
    const res = await apolloTestServer.executeOperation(
      { query: UPDATE_USER_IDENTIFIED_AT, variables: { id } },
      { contextValue: apolloContext(jest.rootUser) },
    );
    apolloExpect(res, 'data', {
      updateUserIdentifiedAt: { ...expectedFormat, identifiedAt: expectedDateFormat(true) },
    });

    // UPDATE_USER_IDENTIFIED_AT (by tenantAdmin)
    const res2 = await apolloTestServer.executeOperation(
      { query: UPDATE_USER_IDENTIFIED_AT, variables: { id } },
      { contextValue: apolloContext(jest.tenantAdmin) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    // clean up
    await User.deleteOne({ _id: id });
  });
});
