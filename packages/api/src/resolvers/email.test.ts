/**
 * Jest: /resolvers/email
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import configLoader from '../config/config-loader';
import {
  apolloExpect,
  ApolloServer,
  domain,
  expectedUserFormatApollo,
  jestSetup,
  jestTeardown,
  uniqueTestUser,
} from '../jest';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_EMAIL,
  IS_EMAIL_AVAILABLE,
  REMOVE_EMAIL,
  SEND_TEST_EMAIL,
  SEND_VERIFICATION_EMAIL,
  VERIFY_EMAIL,
} from '../queries/email';
import token from '../utils/token';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

// Top level of this test suite:
describe('Email GraphQL', () => {
  let adminServer: ApolloServer | null;
  let adminUser: LeanDocument<UserDocument> | null;
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUser: LeanDocument<UserDocument> | null;
  let tenantAdmin: LeanDocument<UserDocument> | null;
  let tenantAdminServer: ApolloServer | null;

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer, normalUser, tenantAdmin, tenantAdminServer } =
      await jestSetup(['admin', 'guest', 'normal', 'tenantAdmin'], { apollo: true }));
  });
  afterAll(jestTeardown);

  test('should response true when email is available', async () => {
    expect.assertions(1);

    const email = `brand.new@${domain}`;
    const res = await guestServer!.executeOperation({ query: IS_EMAIL_AVAILABLE, variables: { email } });
    apolloExpect(res, 'data', { isEmailAvailable: true });
  });

  test('should response false when email is not available', async () => {
    expect.assertions(1);

    const [email] = normalUser!.emails;
    const res = await guestServer!.executeOperation({ query: IS_EMAIL_AVAILABLE, variables: { email } });
    apolloExpect(res, 'data', { isEmailAvailable: false });
  });

  test('should fail when checking with an invalid email format', async () => {
    expect.assertions(1);

    const email = 'invalid@email';
    const res = await guestServer!.executeOperation({ query: IS_EMAIL_AVAILABLE, variables: { email } });
    apolloExpect(res, 'errorContaining', 'email must be a valid email');
  });

  test('should fail when sending a test email (as normalUser)', async () => {
    expect.assertions(1);

    const [email] = normalUser!.emails;
    const res = await normalServer!.executeOperation({ query: SEND_TEST_EMAIL, variables: { email } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
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

  test('should pass when sending a verification email & verify (as normalUser)', async () => {
    expect.assertions(3);

    const { _id, emails } = normalUser!;
    const email = emails[0].toLowerCase();

    // request verification email
    const res1 = await normalServer!.executeOperation({ query: SEND_VERIFICATION_EMAIL, variables: { email } });
    apolloExpect(res1, 'data', { sendVerificationEmail: { code: MSG_ENUM.COMPLETED } });

    // verify email
    const confirmToken = await token.signEvent(email.toLowerCase(), 'email', DEFAULTS.AUTH.EMAIL_CONFIRM_EXPIRES_IN);
    const res2 = await guestServer!.executeOperation({ query: VERIFY_EMAIL, variables: { token: confirmToken } });
    apolloExpect(res2, 'data', { verifyEmail: { code: MSG_ENUM.COMPLETED } });

    // check update user email
    const user = await User.findById(_id, 'emails').lean();
    expect(user!.emails.includes(email.toLowerCase())).toBeTrue();

    // clean-up (undo verification, restore original values [uppercase or lowercase case])
    await User.findByIdAndUpdate(_id, { emails }).lean();
  });

  test('should pass when add & remove email', async () => {
    expect.assertions(2);

    const { emails } = normalUser!;
    const { email } = uniqueTestUser(); // generate an unique & valid email

    // add email
    const addRes = await normalServer!.executeOperation({ query: ADD_EMAIL, variables: { email } });
    apolloExpect(addRes, 'data', {
      addEmail: expect.objectContaining({ ...expectedUserFormatApollo, emails: [...emails, email.toUpperCase()] }),
    });

    // remove email
    const removeRes = await normalServer!.executeOperation({ query: REMOVE_EMAIL, variables: { email } });
    apolloExpect(removeRes, 'data', { removeEmail: expect.objectContaining({ ...expectedUserFormatApollo, emails }) });
  });

  // test('should fail when mutating without ADMIN role', async () => {
  //   expect.assertions(2);

  //   // add a document
  //   const res = await normalServer!.executeOperation({
  //     query: ADD_DISTRICT,
  //     variables: { district: { name: FAKE_LOCALE, region: FAKE_LOCALE } },
  //   });
  //   apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);

  //   // add remark
  //   const res2 = await normalServer!.executeOperation({
  //     query: ADD_DISTRICT_REMARK,
  //     variables: { id: FAKE, remark: FAKE },
  //   });
  //   apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  // });

  // test('should pass when ADD, ADD_REMARK, & UPDATE & DELETE', async () => {
  //   expect.assertions(4);

  //   // add a document
  //   const createdRes = await adminServer!.executeOperation({
  //     query: ADD_DISTRICT,
  //     variables: { district: { name: FAKE_LOCALE, region: FAKE2_LOCALE } },
  //   });
  //   apolloExpect(createdRes, 'data', { addDistrict: expectedAdminFormat });
  //   const newId: string = createdRes.data!.addDistrict._id;

  //   // add remark
  //   const addRemarkRes = await adminServer!.executeOperation({
  //     query: ADD_DISTRICT_REMARK,
  //     variables: { id: newId, remark: FAKE },
  //   });
  //   apolloExpect(addRemarkRes, 'data', {
  //     addDistrictRemark: { ...expectedAdminFormat, ...expectedRemark(adminUser!, FAKE, true) },
  //   });

  //   // update newly created document
  //   const updatedRes = await adminServer!.executeOperation({
  //     query: UPDATE_DISTRICT,
  //     variables: { id: newId, district: { name: FAKE2_LOCALE, region: FAKE_LOCALE } },
  //   });
  //   apolloExpect(updatedRes, 'data', { updateDistrict: expectedAdminFormat });

  //   // delete newly created document
  //   const removedRes = await adminServer!.executeOperation({
  //     query: REMOVE_DISTRICT,
  //     variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
  //   });
  //   apolloExpect(removedRes, 'data', { removeDistrict: { code: MSG_ENUM.COMPLETED } });
  // });

  // test('should fail when ADD without name or region', async () => {
  //   expect.assertions(2);

  //   // add without region
  //   const res1 = await adminServer!.executeOperation({
  //     query: ADD_DISTRICT,
  //     variables: { district: { name: FAKE_LOCALE } },
  //   });
  //   apolloExpect(res1, 'errorContaining', 'Field "region" of required type "LocaleInput!" was not provided.');

  //   // add without name
  //   const res2 = await adminServer!.executeOperation({
  //     query: ADD_DISTRICT,
  //     variables: { district: { region: FAKE_LOCALE } },
  //   });
  //   apolloExpect(res2, 'errorContaining', 'Field "name" of required type "LocaleInput!" was not provided.');
  // });
});
