/**
 * Jest: /resolvers/user
 * ! note: (JEST) tenantAdmin is a school tenantAdmin

 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
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
  testServer,
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

describe('Auth-Extra GraphQL (token)', () => {
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let rootServer: ApolloServer | null;
  let rootUser: UserDocument | null;
  let normalUser: UserDocument | null;

  let tenant: TenantDocument | null;
  let tenantAdmin: UserDocument | null;
  let tenantAdminServer: ApolloServer | null;
  let tenantId: string | null;

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
    ({ guestServer, normalServer, normalUser, rootServer, rootUser, tenant, tenantAdmin, tenantAdminServer, tenantId } =
      await jestSetup(['guest', 'normal', 'root', 'tenantAdmin'], { apollo: true }));

    if (!tenant!.school) throw 'Tenant must be a school tenant in order to run user.test';
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
    const manyRes = await rootServer!.executeOperation({ query: GET_USERS });
    apolloExpect(manyRes, 'data', {
      users: expect.arrayContaining([expectedFormat]),
    });

    const id = (randomItem(manyRes.data!.users) as { _id: string })._id;
    const oneRes = await rootServer!.executeOperation({ query: GET_USER, variables: { id } });
    apolloExpect(oneRes, 'data', { user: { ...expectedFormat, _id: id } });
  });

  test('should response an array of data when GET all and Get One (as school tenantAdmin)', async () => {
    expect.assertions(2);

    const manyRes = await tenantAdminServer!.executeOperation({ query: GET_USERS });
    apolloExpect(manyRes, 'data', {
      users: expect.arrayContaining([{ ...expectedFormat, tenants: expect.arrayContaining([tenantId]) }]),
    });

    const id = (randomItem(manyRes.data!.users) as { _id: string })._id;
    const oneRes = await tenantAdminServer!.executeOperation({ query: GET_USER, variables: { id } });
    apolloExpect(oneRes, 'data', { user: { ...expectedFormat, _id: id, tenants: expect.arrayContaining([tenantId]) } });
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

    const server = testServer(admin);
    const manyRes = await server.executeOperation({ query: GET_USERS });
    apolloExpect(manyRes, 'data', { users: expect.arrayContaining([expectedFormatEx]) });

    const id = (randomItem(manyRes.data!.users) as { _id: string })._id;
    const oneRes = await server.executeOperation({ query: GET_USER, variables: { id } });
    apolloExpect(oneRes, 'data', { user: { ...expectedFormatEx, _id: id } });

    // clean up
    await Promise.all([
      User.deleteOne({ _id: admin._id }),
      Tenant.findByIdAndUpdate(nonSchoolTenant._id, { $pull: { admins: admin._id } }).lean(),
    ]);
  });

  test('should fail when  GET All or Get One (as guest or non TenantAdmin)', async () => {
    expect.assertions(4);
    const manyRes = await guestServer!.executeOperation({ query: GET_USERS });
    apolloExpect(manyRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const oneRes = await guestServer!.executeOperation({ query: GET_USER, variables: { id: mongoId().toString() } });
    apolloExpect(oneRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const manyRes2 = await normalServer!.executeOperation({ query: GET_USERS });
    apolloExpect(manyRes2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    const oneRes2 = await normalServer!.executeOperation({ query: GET_USER, variables: { id: mongoId().toString() } });
    apolloExpect(oneRes2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should fail when ADD_USER, UPDATE, CHANGE_USER_PASSWORD (as guest or non school tenantAdmin)', async () => {
    expect.assertions(6);

    const nonSchoolTenant = await Tenant.findOne({ school: { $exists: false } }).lean();
    const user = nonSchoolTenant ? await User.findOne({ tenants: nonSchoolTenant._id }).lean() : null;
    if (!nonSchoolTenant || !user) throw 'Non-school tenant & user are required to proceed';

    const { user: admin } = await createUser(nonSchoolTenant._id.toString());
    await Tenant.updateOne({ _id: nonSchoolTenant._id }, { $addToSet: { admins: admin._id } });

    const server = testServer(admin); // non school tenantAdmin

    // ADD_USER
    const tenantId = nonSchoolTenant._id.toString();
    const { name, emails } = genUser(null);
    const addRes = await guestServer!.executeOperation({ query: ADD_USER, variables: { email: emails[0], name } });
    apolloExpect(addRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const add2Res = await server.executeOperation({ query: ADD_USER, variables: { email: emails[0], name, tenantId } });
    apolloExpect(add2Res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // ADD_USER_REMARK
    const id = user._id.toString();
    const updateRes = await guestServer!.executeOperation({ query: ADD_USER_REMARK, variables: { id, remark: FAKE } });
    apolloExpect(updateRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const update2Res = await server.executeOperation({ query: ADD_USER_REMARK, variables: { id, remark: FAKE } });
    apolloExpect(update2Res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // CHANGE_USER_PASSWORD
    const password = User.genValidPassword();
    const changePasswdRes = await guestServer!.executeOperation({
      query: CHANGE_USER_PASSWORD,
      variables: { id, password },
    });
    apolloExpect(changePasswdRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const changePasswd2Res = await server!.executeOperation({
      query: CHANGE_USER_PASSWORD,
      variables: { id, password },
    });
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
    const addRes = await rootServer!.executeOperation({ query: ADD_USER, variables: { tenantId, email, name } });
    apolloExpect(addRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  test('should pass when add user (as tenantAdmin) ', async () => {
    expect.assertions(1);

    const { name, emails } = genUser(null);

    // ADD_USER by (school) tenantAdmin
    const create = { tenantId, email: emails[0]!, name, ...(prob(0.5) && { studentId: FAKE }) };
    const addRes = await tenantAdminServer!.executeOperation({ query: ADD_USER, variables: create });
    apolloExpect(addRes, 'data', {
      addUser: {
        ...expectedFormat,
        flags: [USER.FLAG.REQUIRE_PASSWORD_CHANGE],
        tenants: [tenantId],
        name,
        emails: [emails[0]!.toUpperCase()], // upper-case for unverified email
        ...(create.studentId && { studentIds: [`${tenantId}#${FAKE}`] }),
      },
    });

    // clean up
    await User.deleteOne({ _id: addRes.data!.addUser._id });
  });

  test('should fail when add already existing users (not in tenantId) (as tenantAdmin)', async () => {
    expect.assertions(1);

    const { user } = await createUser(null);

    // ADD_USER
    const addRes = await tenantAdminServer!.executeOperation({
      query: ADD_USER,
      variables: { tenantId, email: user.emails[0], name: FAKE },
    });
    apolloExpect(addRes, 'error', `MSG_CODE#${MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED}`);

    // clean up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass when add already existing users (already in tenantId) (as tenantAdmin)', async () => {
    // ADD_USER
    const addRes = await tenantAdminServer!.executeOperation({
      query: ADD_USER,
      variables: { tenantId, email: normalUser!.emails[0], name: FAKE },
    });

    apolloExpect(addRes, 'data', { addUser: { ...expectedFormat, _id: normalUser!._id.toString() } });
  });

  test('should pass when change password (as root or tenantAdmin)', async () => {
    expect.assertions(4);

    const { id } = await createUser(tenantId);
    const password = User.genValidPassword();

    // CHANGE_USER_PASSWORD (by ROOT)
    const changePasswordRes = await rootServer!.executeOperation({
      query: CHANGE_USER_PASSWORD,
      variables: { id, password },
    });
    apolloExpect(changePasswordRes, 'data', { changeUserPassword: { code: MSG_ENUM.COMPLETED } });
    let updatedUser = await User.findByIdAndUpdate(id, { $pull: { flags: USER.FLAG.REQUIRE_PASSWORD_CHANGE } }).lean(); // read back & remove flag
    expect(updatedUser!.flags).toEqual([USER.FLAG.REQUIRE_PASSWORD_CHANGE]);

    // CHANGE_USER_PASSWORD (by tenantAdmin)
    const changePassword2Res = await tenantAdminServer!.executeOperation({
      query: CHANGE_USER_PASSWORD,
      variables: { id, password },
    });
    apolloExpect(changePassword2Res, 'data', { changeUserPassword: { code: MSG_ENUM.COMPLETED } });
    updatedUser = await User.findById(id).lean();
    expect(updatedUser!.flags).toEqual([USER.FLAG.REQUIRE_PASSWORD_CHANGE]);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add & remove feature', async () => {
    expect.assertions(4);

    const { id } = await createUser(tenantId);

    // ADD_USER_FEATURE & REMOVE_USER_FEATURE (by ROOT)
    const feature = randomItem(Object.keys(USER.FEATURE));
    const addFeatureRes = await rootServer!.executeOperation({
      query: ADD_USER_FEATURE,
      variables: { id, feature },
    });
    apolloExpect(addFeatureRes, 'data', { addUserFeature: { ...expectedFormat, features: [feature] } });

    const removeFeatureRes = await rootServer!.executeOperation({
      query: REMOVE_USER_FEATURE,
      variables: { id, feature },
    });
    apolloExpect(removeFeatureRes, 'data', { removeUserFeature: { ...expectedFormat, features: [] } });

    // ADD_USER_FEATURE & REMOVE_USER_FEATURE (by tenantAdmin)
    const addFeature2Res = await tenantAdminServer!.executeOperation({
      query: ADD_USER_FEATURE,
      variables: { id, feature },
    });
    apolloExpect(addFeature2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    const removeFeature2Res = await tenantAdminServer!.executeOperation({
      query: REMOVE_USER_FEATURE,
      variables: { id, feature },
    });
    apolloExpect(removeFeature2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add remark', async () => {
    expect.assertions(2);

    const { id } = await createUser(tenantId);

    // ADD_USER_REMARK (by root)
    const addRemarkRes = await rootServer!.executeOperation({
      query: ADD_USER_REMARK,
      variables: { id, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addUserRemark: { ...expectedFormat, ...expectedRemark(rootUser!._id, FAKE, true) },
    });

    // ADD_USER_REMARK (by tenantAdmin)
    const addRemark2Res = await tenantAdminServer!.executeOperation({
      query: ADD_USER_REMARK,
      variables: { id, remark: FAKE2 },
    });
    apolloExpect(addRemark2Res, 'data', {
      addUserRemark: {
        ...expectedFormat,
        remarks: [
          { t: expectedDateFormat(true), u: rootUser!._id.toString(), m: FAKE }, // added by root
          { t: expectedDateFormat(true), u: tenantAdmin!._id.toString(), m: FAKE2 }, // added by tenantAdmin
        ],
      },
    });

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when set & clear flag', async () => {
    expect.assertions(4);

    const { id } = await createUser(tenantId);

    // SET_USER_FLAG & REMOVE_USER_FLAG (by ROOT)
    const flag = USER.FLAG.DEMO;
    const setFlagRes = await rootServer!.executeOperation({
      query: SET_USER_FLAG,
      variables: { id, flag },
    });
    apolloExpect(setFlagRes, 'data', { setUserFlag: { ...expectedFormat, flags: [flag] } });

    const clearFlagRes = await rootServer!.executeOperation({
      query: CLEAR_USER_FLAG,
      variables: { id, flag },
    });
    apolloExpect(clearFlagRes, 'data', { clearUserFlag: { ...expectedFormat, flags: [] } });

    // SET_USER_FLAG & CLEAR_USER_FLAG (by tenantAdmin)
    const setFlag2Res = await tenantAdminServer!.executeOperation({
      query: SET_USER_FLAG,
      variables: { id, flag },
    });
    apolloExpect(setFlag2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    const clearFlag2Res = await tenantAdminServer!.executeOperation({
      query: CLEAR_USER_FLAG,
      variables: { id, flag },
    });
    apolloExpect(clearFlag2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when add schoolHistory', async () => {
    expect.assertions(3);

    const { id } = await createUser(tenantId);

    const tenant = await Tenant.findById(tenantId!).lean();
    const school = await School.findById(tenant!.school).lean();
    const schoolId = school!._id.toString();

    // ADD_USER_SCHOOL_HISTORY (by root)
    const history = { year: schoolYear(), level: randomItem(school!.levels).toString() };
    const addHistoryRes = await rootServer!.executeOperation({
      query: ADD_USER_SCHOOL_HISTORY,
      variables: { id, ...history },
    });
    apolloExpect(addHistoryRes, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // ADD_USER_SCHOOL_HISTORY (by tenantAdmin)
    const addHistory2Res = await tenantAdminServer!.executeOperation({
      query: ADD_USER_SCHOOL_HISTORY,
      variables: { id, ...history },
    });
    apolloExpect(addHistory2Res, 'data', {
      addUserSchoolHistory: {
        ...expectedFormat,
        schoolHistories: [{ school: schoolId, ...history, schoolClass: null, updatedAt: expectedDateFormat(true) }],
      },
    });

    // ADD_USER_SCHOOL_HISTORY (by tenantAdmin) (simulating next year)
    const history2 = { year: schoolYear(1), level: randomItem(school!.levels).toString(), schoolClass: '1X' };
    const addHistory3Res = await tenantAdminServer!.executeOperation({
      query: ADD_USER_SCHOOL_HISTORY,
      variables: { id, ...history2 },
    });
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

    const { id } = await createUser(tenantId);

    // SUSPEND_USER (by ROOT)
    const suspendRes = await rootServer!.executeOperation({ query: SUSPEND_USER, variables: { id } });
    apolloExpect(suspendRes, 'data', { suspendUser: { ...expectedFormat, suspendUtil: expectedDateFormat(true) } });

    // SUSPEND_USER (by tenantAdmin)
    const suspend2Res = await tenantAdminServer!.executeOperation({ query: SUSPEND_USER, variables: { id } });
    apolloExpect(suspend2Res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    // clean up
    await User.deleteOne({ _id: id });
  });

  test('should pass when updateIdentifiedAt', async () => {
    expect.assertions(2);

    const { id } = await createUser(tenantId);

    // UPDATE_USER_IDENTIFIED_AT (by ROOT)
    const res = await rootServer!.executeOperation({ query: UPDATE_USER_IDENTIFIED_AT, variables: { id } });
    apolloExpect(res, 'data', {
      updateUserIdentifiedAt: { ...expectedFormat, identifiedAt: expectedDateFormat(true) },
    });

    // UPDATE_USER_IDENTIFIED_AT (by tenantAdmin)
    const res2 = await tenantAdminServer!.executeOperation({ query: UPDATE_USER_IDENTIFIED_AT, variables: { id } });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ROOT}`);

    // clean up
    await User.deleteOne({ _id: id });
  });
});
