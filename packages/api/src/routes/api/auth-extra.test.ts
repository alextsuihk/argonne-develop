/**
 * JEST Test: check /api/auth/*  auth-extra
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';
import request from 'supertest';

import app from '../../app';
import configLoader from '../../config/config-loader';
import {
  expectedIdFormat,
  expectedUserFormat,
  FAKE,
  FAKE2,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomString,
} from '../../jest';
import type { UserDocument } from '../../models/user';
import VerificationToken from '../../models/verification-token';
import token, { EMAIL_TOKEN_PREFIX } from '../../utils/token';

const { MSG_ENUM } = LOCALE;
const { MESSENGER, SYSTEM, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

// expect auth (login & register) response
export const expectedAuthResponse = {
  accessToken: expect.any(String),
  accessTokenExpireAt: expect.any(String),
  refreshToken: expect.any(String),
  refreshTokenExpireAt: expect.any(String),
  user: expect.objectContaining(expectedUserFormat),
};

// Top level of this test suite:
describe('Auth-Extra API Routes', () => {
  let user: UserDocument;

  beforeAll(async () => {
    const { normalUsers } = await jestSetup();
    user = normalUsers.find(user => user.idx % 2)!; // pick an odd index use (avoiding conflict with API)
  });
  afterAll(jestTeardown);

  console.log('WIP: OAUTH2_LINK & OAUTH2_UNLINK (API)');

  test('should pass when add and remove apiKey', async () => {
    expect.assertions(3 + 3 + 3);

    // add apiKey
    const add = { scope: FAKE, expireAt: addDays(Date.now(), 1), ...(prob(0.5) && { note: FAKE2 }) };
    const apiKeys = [
      ...user.apiKeys,
      { _id: expectedIdFormat, token: expect.any(String), ...add, expireAt: add.expireAt.toISOString() },
    ];
    const addRes = await request(app).patch(`/api/auth/addApiKey`).send(add).set({ 'Jest-User': user._id });
    expect(addRes.body).toEqual({ data: apiKeys });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(200);

    // list apiKeys
    const listRes = await request(app).get(`/api/auth/listApiKeys`).set({ 'Jest-User': user._id });
    expect(listRes.body).toEqual({ data: apiKeys });
    expect(listRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(listRes.status).toBe(200);

    // remove apiKey
    const id = addRes.body.data.at(-1)._id;
    const removeRes = await request(app).patch(`/api/auth/removeApiKey`).send({ id }).set({ 'Jest-User': user._id });
    expect(removeRes.body).toEqual({ data: user.apiKeys });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);
  });

  test('should pass when add, sendVerification, verify & remove email', async () => {
    expect.assertions(3 * 6);

    const email = `JEST-${randomString()}@example.com`;

    // add email
    const addRes = await request(app).patch(`/api/auth/addEmail`).send({ email }).set({ 'Jest-User': user._id });
    expect(addRes.body).toEqual({
      data: expect.objectContaining({
        ...expectedUserFormat,
        emails: [...user.emails, email.toUpperCase()],
      }), // uppercase for unverified email
    });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(200);

    // remove email
    const removeRes = await request(app).patch(`/api/auth/removeEmail`).send({ email }).set({ 'Jest-User': user._id });
    expect(removeRes.body).toEqual({
      data: expect.objectContaining({ ...expectedUserFormat, emails: user.emails }),
    });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);

    // add2 email (re-add)
    const add2Res = await request(app).patch(`/api/auth/addEmail`).send({ email }).set({ 'Jest-User': user._id });
    expect(add2Res.body).toEqual({
      data: expect.objectContaining({
        ...expectedUserFormat,
        emails: [...user.emails, email.toUpperCase()],
      }), // uppercase for unverified email
    });
    expect(add2Res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(add2Res.status).toBe(200);

    // send verification (post)
    const sendVerificationRes = await request(app)
      .post(`/api/auth/sendEmailVerification`)
      .send({ email })
      .set({ 'Jest-User': user._id });
    expect(sendVerificationRes.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(sendVerificationRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(sendVerificationRes.status).toBe(200);

    // verify email
    const confirmToken = await token.signStrings([EMAIL_TOKEN_PREFIX, email], 5);
    const verifyRes = await request(app)
      .patch(`/api/auth/verifyEmail`)
      .send({ token: confirmToken })
      .set({ 'Jest-User': user._id });
    expect(verifyRes.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(verifyRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(verifyRes.status).toBe(200);

    // remove email (restore to original)
    const remove2Res = await request(app).patch(`/api/auth/removeEmail`).send({ email }).set({ 'Jest-User': user._id });
    expect(remove2Res.body).toEqual({
      data: expect.objectContaining({ ...expectedUserFormat, emails: user.emails }),
    });
    expect(remove2Res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(remove2Res.status).toBe(200);
  });

  test('should response true when email is available', async () => {
    expect.assertions(3);

    const email = `JEST-${randomString()}.valid@example.com`;
    const res = await request(app).get(`/api/auth/isEmailAvailable/${email}`);
    expect(res.body).toEqual({ data: true });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should response false when email is not available', async () => {
    expect.assertions(3);

    const [email] = user.emails;
    const res = await request(app).get(`/api/auth/isEmailAvailable/${email}`);
    expect(res.body).toEqual({ data: false });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(200);
  });

  test('should fail when checking with an invalid email format', async () => {
    expect.assertions(3);

    const res = await request(app).get(`/api/auth/isEmailAvailable/invalid_mail`); // yup thinks invalid@email is valid
    expect(res.body).toEqual({
      errors: [{ code: MSG_ENUM.USER_INPUT_ERROR, param: 'email' }],
      statusCode: 422,
      type: 'yup',
    });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(422);
  });

  test('should pass when add, sendVerification, verify & remove messenger', async () => {
    expect.assertions(3 + 2 + 3 + 1 + 3 + 3);

    const provider = randomItem(Object.keys(MESSENGER.PROVIDER));
    const account = `AbC_${randomString()}`; // mixed cased
    const lowercase = `${provider.toLowerCase()}#${account}`;
    const upperCase = `${provider.toUpperCase()}#${account}`;

    // add messenger
    const addRes = await request(app)
      .patch(`/api/auth/addMessenger`)
      .send({ provider, account })
      .set({ 'Jest-User': user._id });
    expect(addRes.body).toEqual({
      data: expect.objectContaining({ ...expectedUserFormat, messengers: [...user.messengers, lowercase] }), // lower case for unverified
    });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(200);

    // confirm token is generated in VerificationToken collection
    const originalToken = await VerificationToken.findOne({ user: user._id, messenger: lowercase }).lean();
    expect(originalToken!.user.toString()).toEqual(user._id.toString());
    expect(originalToken!.messenger).toEqual(lowercase);

    // send verification (post)
    const sendVerificationRes = await request(app)
      .post(`/api/auth/sendMessengerVerification`)
      .send({ provider, account })
      .set({ 'Jest-User': user._id });
    expect(sendVerificationRes.body).toEqual({ code: MSG_ENUM.COMPLETED });
    expect(sendVerificationRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(sendVerificationRes.status).toBe(200);

    // verificationToken should be updated
    const updatedToken = await VerificationToken.findOne({ user: user._id, messenger: lowercase }).lean();
    expect(
      !originalToken!._id.equals(updatedToken!._id) &&
        originalToken!.token !== updatedToken!.token &&
        updatedToken &&
        user._id.equals(updatedToken.user) &&
        updatedToken.messenger === lowercase,
    ).toBeTrue();

    // verify messenger
    const verifyRes = await request(app)
      .patch(`/api/auth/verifyMessenger`)
      .send({ provider, account, token: updatedToken!.token })
      .set({ 'Jest-User': user._id });
    expect(verifyRes.body).toEqual({
      data: expect.objectContaining({
        ...expectedUserFormat,
        messengers: [...user.messengers, upperCase], // upper case for verified
      }),
    });
    expect(verifyRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(verifyRes.status).toBe(200);

    // remove messenger (restore to original)
    const removeRes = await request(app)
      .patch(`/api/auth/removeMessenger`)
      .send({ provider, account })
      .set({ 'Jest-User': user._id });
    expect(removeRes.body).toEqual({
      data: expect.objectContaining({ ...expectedUserFormat, messengers: user.messengers }),
    });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);
  });

  test('should pass when add & remove paymentMethod', async () => {
    expect.assertions(3 + 3);

    // add paymentMethod
    const payment = {
      currency: 'HKD',
      account: randomString(),
      payable: prob(0.5),
      receivable: prob(0.5),
      ...(prob(0.5) && { bank: 'HSBC' }),
    };
    const addRes = await request(app).patch(`/api/auth/addPaymentMethod`).send(payment).set({ 'Jest-User': user._id });
    expect(addRes.body).toEqual({
      data: expect.objectContaining({
        ...expectedUserFormat,
        paymentMethods: [
          ...user.paymentMethods,
          { _id: expectedIdFormat, ...payment, ...(payment.bank && { bank: payment.bank }) },
        ],
      }),
    });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(200);

    // remove paymentMethods
    const id = addRes.body.data.paymentMethods.at(-1)._id;
    const removeRes = await request(app)
      .patch(`/api/auth/removePaymentMethod`)
      .send({ id })
      .set({ 'Jest-User': user._id });
    expect(removeRes.body).toEqual({
      data: expect.objectContaining({ ...expectedUserFormat, paymentMethods: user.paymentMethods }),
    });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);
  });

  test('should pass when add & remove avatar', async () => {
    expect.assertions(3 + 3);

    // add avatarUrl
    const url = await jestPutObject(user._id);
    const addRes = await request(app)
      .patch(`/api/auth/updateAvatar`)
      .send({ avatarUrl: url })
      .set({ 'Jest-User': user._id });
    expect(addRes.body).toEqual({ data: expect.objectContaining({ ...expectedUserFormat, avatarUrl: url }) });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(200);

    // remove avatarUrls
    const removeRes = await request(app).patch(`/api/auth/updateAvatar`).set({ 'Jest-User': user._id }); // send NO avatarUrl to remove
    expect(removeRes.body.data.avatarUrl).toBeUndefined();
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);

    // clean up
    await jestRemoveObject(url);
  });

  test('should pass when add & remove stash', async () => {
    expect.assertions(3 + 3);
    const url = await jestPutObject(user._id);

    const add = { title: FAKE, secret: FAKE2, url };
    const addRes = await request(app).patch(`/api/auth/addStash`).send(add).set({ 'Jest-User': user._id });
    expect(addRes.body).toEqual({
      data: expect.objectContaining({
        ...expectedUserFormat,
        stashes: [...user.stashes, { _id: expectedIdFormat, ...add }],
      }),
    });
    expect(addRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRes.status).toBe(200);

    const id = addRes.body.data.stashes.at(-1)._id;
    const removeRes = await request(app).patch(`/api/auth/removeStash`).send({ id }).set({ 'Jest-User': user._id }); // send NO avatarUrl to remove
    expect(removeRes.body).toEqual({
      data: expect.objectContaining({ ...expectedUserFormat, stashes: user.stashes }),
    });
    expect(removeRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeRes.status).toBe(200);

    // clean up
    await jestRemoveObject(url);
  });

  test('should pass when update locale', async () => {
    expect.assertions(3 + 3);

    let locale = randomItem(Object.keys(SYSTEM.LOCALE).filter(l => l !== DEFAULTS.USER.LOCALE));
    const res1 = await request(app).patch(`/api/auth/updateLocale`).send({ locale }).set({ 'Jest-User': user._id });
    expect(res1.body).toEqual({ data: expect.objectContaining({ ...expectedUserFormat, locale }) });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(200);

    locale = DEFAULTS.USER.LOCALE;
    const res2 = await request(app).patch(`/api/auth/updateLocale`).send({ locale }).set({ 'Jest-User': user._id });
    expect(res2.body).toEqual({ data: expect.objectContaining({ ...expectedUserFormat, locale }) });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(200);
  });

  test('should pass when update availability', async () => {
    expect.assertions(3 + 3);

    const availability = randomItem(
      Object.keys(USER.AVAILABILITY).filter(x => x !== USER.AVAILABILITY.ONLINE && x !== USER.AVAILABILITY.OFFLINE),
    );
    const res1 = await request(app)
      .patch(`/api/auth/updateAvailability`)
      .send({ availability })
      .set({ 'Jest-User': user._id });
    expect(res1.body).toEqual({ data: expect.objectContaining({ ...expectedUserFormat, availability }) });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(200);

    // $unset availability
    const res2 = await request(app).patch(`/api/auth/updateAvailability`).set({ 'Jest-User': user._id }); // availability = undefined
    expect(res2.body.data.availability).toBeUndefined();
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(200);
  });

  test('should pass when update profile', async () => {
    expect.assertions(3 + 5);

    const update = {
      name: FAKE,
      formalName: { enUS: FAKE, zhHK: FAKE2, zhCN: FAKE },
      yob: 2010 + Math.floor(Math.random() * 10),
      dob: new Date(),
    };
    const res1 = await request(app).patch(`/api/auth/updateProfile`).send(update).set({ 'Jest-User': user._id });
    const dob = update.dob.toISOString(); // cast to string
    expect(res1.body).toEqual({ data: expect.objectContaining({ ...expectedUserFormat, ...update, dob }) });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(200);

    // clear out profile (except name is not clearable)
    const res2 = await request(app)
      .patch(`/api/auth/updateProfile`)
      .send({ name: FAKE })
      .set({ 'Jest-User': user._id });
    expect(res2.body.data.formalName).toBeUndefined();
    expect(res2.body.data.yob).toBeUndefined();
    expect(res2.body.data.dob).toBeUndefined();
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(200);
  });
});
