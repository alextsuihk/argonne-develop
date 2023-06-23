/**
 * JEST Test: /api/users routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import {
  domain,
  expectedIdFormat,
  expectedUserFormat,
  jestSetup,
  jestTeardown,
  prob,
  randomString,
  shuffle,
  uniqueTestUser,
} from '../../jest';
import Tenant from '../../models/tenant';
import type { Id, UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;

const { createUpdateDelete, getMany } = commonTest;
const route = 'users';

// Top level of this test suite:
describe('User API Routes', () => {
  let adminUser: (UserDocument & Id) | null;
  let normalUser: (UserDocument & Id) | null;
  let rootUser: (UserDocument & Id) | null;
  let tenantAdmin: (UserDocument & Id) | null;
  let tenantId: string | null;

  const expectedUserTenantMinFormat = {
    _id: expectedIdFormat,
    flags: expectedUserFormat.flags,
    tenants: expectedUserFormat.tenants,
    status: expectedUserFormat.status,
    name: expectedUserFormat.name,
    emails: expectedUserFormat.emails,
    studentIds: expectedUserFormat.studentIds,
    schoolHistories: expectedUserFormat.schoolHistories,
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

  test('should pass when getMany & getById (by TenantAdmin)', async () =>
    getMany(
      route,
      { 'Jest-User': tenantAdmin!._id },
      { ...expectedUserTenantMinFormat, tenants: expect.arrayContaining([expect.any(String)]) },
      { testGetById: true, testInvalidId: true, testNonExistingId: true },
    ));

  // ROOT could get publisherAdmins (who don't have tenants, schoolHistories, studentIds)
  test('should pass when getMany & getById (by ROOT)', async () =>
    getMany(
      route,
      { 'Jest-User': rootUser!._id },
      {
        ...expectedUserTenantMinFormat,
        tenants: expect.any(Array),
        schoolHistories: expect.any(Array),
        studentIds: expect.any(Array),
        emails: expect.any(Array),
      },
      {
        testGetById: true,
        testInvalidId: true,
        testNonExistingId: true,
      },
    ));

  test('should fail when normalUser try to create user', async () => {
    const { email, name } = uniqueTestUser();

    await createUpdateDelete(route, { 'Jest-User': normalUser!._id }, [
      {
        action: 'create',
        data: { tenantId: tenantId, email, name },
        expectedResponse: {
          statusCode: 403,
          data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
        },
      },
    ]);
  });

  test('should fail when admin try to create user', async () => {
    const { email, name } = uniqueTestUser();

    await createUpdateDelete(route, { 'Jest-User': adminUser!._id }, [
      {
        action: 'create',
        data: { tenantId: tenantId, email, name },
        expectedResponse: {
          statusCode: 403,
          data: { type: 'plain', statusCode: 403, errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }] },
        },
      },
    ]);
  });

  test('should pass when root creates user (e.g. publisherAdmin)', async () => {
    const { email, name } = uniqueTestUser();

    const user = await createUpdateDelete<UserDocument & Id>(route, { 'Jest-User': rootUser!._id }, [
      {
        action: 'create',
        data: { email, name },
        expectedMinFormat: { ...expectedUserTenantMinFormat, tenants: [], name, emails: [email.toUpperCase()] }, // email is unverified
      },
    ]);

    // clean up
    await User.deleteOne({ _id: user!._id });
  });

  test('should fail when school tenantAdmin creates an existing user (who NOT in tenant)', async () => {
    // create a new user (without tenants)
    const { email, name, password } = uniqueTestUser();
    const user = await User.create({ tenants: [], name, emails: [email], password });

    await createUpdateDelete<UserDocument & Id>(route, { 'Jest-User': tenantAdmin!._id }, [
      {
        action: 'create',
        data: { tenantId: tenantId, email, name },
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
        expectedMinFormat: expectedUserTenantMinFormat,
      },
    ]);

    // clean up
    await User.deleteOne({ _id: user!._id });
  });

  test('should pass when school tenantAdmin creates user and updateSchool()', async () => {
    const { email, name } = uniqueTestUser();
    const studentId = prob(0.5) ? randomString() : null;

    const tutorTenant = await Tenant.findTutor();

    // create new user
    const user = await createUpdateDelete<UserDocument & Id>(
      route,
      { 'Jest-User': tenantAdmin!._id },
      [
        {
          action: 'create',
          data: { tenantId: tenantId, email, name, ...(studentId && { studentId }) },
          expectedMinFormat: {
            ...expectedUserTenantMinFormat,
            tenants: [tenantId!, tutorTenant._id.toString()],
            name,
            emails: [email.toUpperCase()], // email is unverified
            ...(studentId && { studentIds: [`${tenantId}#${studentId}`] }),
          },
        },
      ],
      { skipAssertion: true },
    );

    // updateSchool
    // !TODO

    // clean up
    await User.deleteOne({ _id: user!._id });
  });

  // TODO: full suite,  add/verify(self generate token)/remove email, update profile.....  (& clean up)

  test('should pass when update user', async () => {
    console.log('TODO, normalUser updating profile');
    // expect.assertions(13);
    // const [level] = (await Level.find({ deletedAt: { $exists: false } })).sort(shuffle);
    // const [subject] = (await Subject.find({ levels: level._id, deletedAt: { $exists: false } })).sort(shuffle);
    // const data = {
    //   ...(prob(0.5) && {note:  'Jest note'}) ,
    //   lang: Object.keys(QUESTION.LANG)[0]
    //     .sort(shuffle)
    //     .splice(2),
    //   subjectId: subject._id,
    //   levelId: level._id,
    // };
    // // add specialty
    // const addRes = await request(app).post(`/api/specialties`).send(data).set({ 'Jest-User': normalUser!._id });
    // expect(addRes.body).toEqual({ data: expectedFormat });
    // expect(addRes.status).toBe(201);
    // expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    // const newlyCreatedSpecialtyId = addRes.body.data.pop()!._id;
  });

  // TODO: tenantAdmin create without tenantId
});
