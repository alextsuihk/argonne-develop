/**
 * JEST Test: /api/emails routes
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';
import request from 'supertest';

import app from '../../app';
import configLoader from '../../config/config-loader';
import { domain, expectedUserFormat, jestSetup, jestTeardown, uniqueTestUser } from '../../jest';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import token from '../../utils/token';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;

// Top level of this test suite:
describe('Email API Routes', () => {
  let adminUser: LeanDocument<UserDocument> | null;
  let normalUser: LeanDocument<UserDocument> | null;
  let tenantAdmin: LeanDocument<UserDocument> | null;

  beforeAll(async () => {
    ({ adminUser, normalUser, tenantAdmin } = await jestSetup(['admin', 'normal', 'tenantAdmin']));
  });

  afterAll(jestTeardown);

  test('should response true when email is available', async () => {
    expect.assertions(3);

    const res = await request(app)
      .post(`/api/emails/isAvailable`)
      .send({ email: `brand.new@${domain}` });
    expect(res.body).toEqual({ data: true });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should response false when email is not available', async () => {
    expect.assertions(3);

    const res = await request(app).post(`/api/emails/isAvailable`).send({ email: normalUser!.emails[0] });
    expect(res.body).toEqual({ data: false });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when checking with an invalid email format', async () => {
    expect.assertions(3);

    const res = await request(app).post('/api/emails/isAvailable').send({ email: 'invalid@@email' });
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'email' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });

  test('should fail when sending a test email (as normalUser)', async () => {
    expect.assertions(3);

    const { _id, emails } = normalUser!;
    const res = await request(app).post(`/api/emails/sendTest`).set({ 'Jest-User': _id }).send({ email: emails[0] });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);
  });

  test('should fail when sending a test email (without email or wrong email)', async () => {
    expect.assertions(6);

    const { _id } = adminUser!;
    const email = 'wrong@email.com';
    const res1 = await request(app).post(`/api/emails/sendTest`).set({ 'Jest-User': _id }).send({ email });
    expect(res1.body).toEqual({ errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }], statusCode: 422, type: 'plain' });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(422);

    const res2 = await request(app).post(`/api/emails/sendTest`).set({ 'Jest-User': _id });
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

    const { _id, emails } = tenantAdmin!;
    const res = await request(app).post(`/api/emails/sendTest`).set({ 'Jest-User': _id }).send({ email: emails[0] });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should pass when sending a test email (as admin)', async () => {
    expect.assertions(3);

    const { _id, emails } = adminUser!;
    const res = await request(app).post(`/api/emails/sendTest`).set({ 'Jest-User': _id }).send({ email: emails[0] });
    expect(res.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should pass when sending a verification email & verify (as normalUser)', async () => {
    expect.assertions(7);

    const { _id, emails } = normalUser!;
    const email = emails[0].toLowerCase();

    // request verification email
    const res1 = await request(app).post(`/api/emails/sendVerification`).set({ 'Jest-User': _id }).send({ email });
    expect(res1.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(200);

    // verify email
    const confirmToken = await token.signEvent(email.toLowerCase(), 'email', DEFAULTS.AUTH.EMAIL_CONFIRM_EXPIRES_IN);
    const res2 = await request(app).post(`/api/emails/verify`).set({ 'Jest-User': _id }).send({ token: confirmToken });
    expect(res2.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(200);

    // check update user email
    const user = await User.findById(_id, 'emails').lean();
    expect(user!.emails.some(e => e === email.toLowerCase())).toBeTrue();

    // clean-up (undo verification, restore original values [uppercase or lowercase case])
    await User.findByIdAndUpdate(_id, { emails }).lean();
  });

  test('should pass when add & remove email', async () => {
    expect.assertions(6);

    const { _id, emails } = normalUser!;
    const { email } = uniqueTestUser(); // generate an unique & valid email

    // add email
    const addRes = await request(app).post(`/api/emails/add`).set({ 'Jest-User': _id }).send({ email });
    expect(addRes.body).toEqual({
      data: expect.objectContaining({ ...expectedUserFormat, emails: [...emails, email.toUpperCase()] }),
    });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(200);

    // remove email
    const removeRes = await request(app).post(`/api/emails/remove`).set({ 'Jest-User': _id }).send({ email });
    expect(removeRes.body).toEqual({ data: expect.objectContaining({ ...expectedUserFormat, emails }) });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);
  });
});
