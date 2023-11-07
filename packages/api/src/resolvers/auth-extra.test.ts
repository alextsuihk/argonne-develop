// TODO: IMPERSONATE_START, IMPERSONATE_STOP, LOGIN_WITH_STUDENT_ID, OAUTH2, OAUTH2_CONNECT, OAUTH2_DISCONNECT,

/**
 * Jest: /resolvers/auth-extra
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import configLoader from '../config/config-loader';
import {
  apolloExpect,
  apolloContext,
  apolloTestServer,
  expectedIdFormat,
  expectedUserFormatApollo as expectedUserFormat,
  FAKE,
  FAKE2,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomString,
} from '../jest';
import type { UserDocument } from '../models/user';
import VerificationToken from '../models/verification-token';
import {
  ADD_API_KEY,
  ADD_EMAIL,
  ADD_MESSENGER,
  ADD_PAYMENT_METHOD,
  ADD_STASH,
  IS_EMAIL_AVAILABLE,
  LIST_API_KEYS,
  // OAUTH2_LINK,
  // OAUTH2_UNLINK,
  REMOVE_API_KEY,
  REMOVE_EMAIL,
  REMOVE_MESSENGER,
  REMOVE_PAYMENT_METHOD,
  // REMOVE_PUSH_SUBSCRIPTIONS,
  REMOVE_STASH,
  SEND_EMAIL_VERIFICATION,
  SEND_MESSENGER_VERIFICATION,
  UPDATE_AVAILABILITY,
  UPDATE_AVATAR,
  UPDATE_LOCALE,
  UPDATE_PROFILE,
  VERIFY_EMAIL,
  VERIFY_MESSENGER,
} from '../queries/auth';
import token, { EMAIL_TOKEN_PREFIX } from '../utils/token';

const { MSG_ENUM } = LOCALE;
const { MESSENGER, SYSTEM, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

describe('Auth-Extra GraphQL (token)', () => {
  let user: UserDocument;

  beforeAll(async () => {
    const { normalUsers } = await jestSetup();
    user = normalUsers.find(user => !(user.idx % 2))!; // pick an even index use (avoiding conflict with API)
  });
  afterAll(jestTeardown);

  console.log('WIP: REMOVE_PUSH_SUBSCRIPTIONS, OAUTH2_LINK & OAUTH2_UNLINK (Apollo)');

  test('should pass when add, list and remove apiKey', async () => {
    expect.assertions(3);

    // add apiKey
    const add = { scope: FAKE, expireAt: addDays(Date.now(), 1), ...(prob(0.5) && { note: FAKE2 }) };
    const apiKeys = [
      ...user.apiKeys.map(api => ({ ...api, token: expect.any(String), note: api.note || null })),
      {
        _id: expectedIdFormat,
        token: expect.any(String),
        scope: add.scope,
        expireAt: add.expireAt.getTime(),
        note: add.note || null,
      },
    ];
    const addRes = await apolloTestServer.executeOperation(
      { query: ADD_API_KEY, variables: add },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(addRes, 'data', { addApiKey: apiKeys });

    // list apiKeys
    const listRes = await apolloTestServer.executeOperation<{ listApiKeys: UserDocument['apiKeys'] }>(
      { query: LIST_API_KEYS },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(listRes, 'data', { listApiKeys: apiKeys });

    // remove apiKey
    const id = listRes.body.kind === 'single' ? listRes.body.singleResult.data!.listApiKeys.at(-1)?._id : null;

    const removeRes = await apolloTestServer.executeOperation(
      { query: REMOVE_API_KEY, variables: { id: id! } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(removeRes, 'data', {
      removeApiKey: user.apiKeys.map(api => ({
        ...api,
        token: expect.any(String),
        note: api.note ?? null,
      })),
    });
  });

  test('should pass when add, sendVerification, verify & remove email', async () => {
    expect.assertions(6);
    const email = `JEST-${randomString()}@example.com`;

    // add email
    const add1Res = await apolloTestServer.executeOperation(
      { query: ADD_EMAIL, variables: { email } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(add1Res, 'data', {
      addEmail: expect.objectContaining({
        ...expectedUserFormat,
        emails: [...user.emails, email.toUpperCase()], // unverified email
      }),
    });

    // remove email
    const remove1Res = await apolloTestServer.executeOperation(
      { query: REMOVE_EMAIL, variables: { email } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(remove1Res, 'data', {
      removeEmail: expect.objectContaining({ ...expectedUserFormat, emails: user.emails }), // back to original
    });

    // add2 email
    const add2Res = await apolloTestServer.executeOperation(
      { query: ADD_EMAIL, variables: { email } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(add2Res, 'data', {
      addEmail: expect.objectContaining({
        ...expectedUserFormat,
        emails: [...user.emails, email.toUpperCase()],
      }),
    });

    // send verification
    const sendVerificationRes = await apolloTestServer.executeOperation(
      { query: SEND_EMAIL_VERIFICATION, variables: { email } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(sendVerificationRes, 'data', { sendEmailVerification: { code: MSG_ENUM.COMPLETED } });

    // verify email
    const confirmToken = await token.signStrings([EMAIL_TOKEN_PREFIX, email], 5);
    const verifyRes = await apolloTestServer.executeOperation(
      { query: VERIFY_EMAIL, variables: { token: confirmToken } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(verifyRes, 'data', { verifyEmail: { code: MSG_ENUM.COMPLETED } });

    // remove2 email
    const remove2Res = await apolloTestServer.executeOperation(
      { query: REMOVE_EMAIL, variables: { email } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(remove2Res, 'data', {
      removeEmail: expect.objectContaining({ ...expectedUserFormat, emails: user.emails }),
    });
  });

  test('should response true when email is available', async () => {
    expect.assertions(1);

    const email = `JEST-${randomString()}.valid@example.com`;
    const res = await apolloTestServer.executeOperation(
      { query: IS_EMAIL_AVAILABLE, variables: { email } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { isEmailAvailable: true });
  });

  test('should response false when email is not available', async () => {
    expect.assertions(1);

    const [email] = user!.emails;
    const res = await apolloTestServer.executeOperation(
      { query: IS_EMAIL_AVAILABLE, variables: { email } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'data', { isEmailAvailable: false });
  });

  test('should fail when checking with an invalid email format', async () => {
    expect.assertions(1);

    const INVALID_EMAIL = 'invalid_mail'; // yup thinks invalid@email is valid
    const res = await apolloTestServer.executeOperation(
      { query: IS_EMAIL_AVAILABLE, variables: { email: INVALID_EMAIL } },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'errorContaining', 'email must be a valid email');
  });

  test('should pass when add, sendVerification, verify & remove messenger', async () => {
    expect.assertions(7);

    const provider = randomItem(Object.keys(MESSENGER.PROVIDER));
    const account = `Abc_${randomString()}`; // mixed cased
    const lowercase = `${provider.toLowerCase()}#${account}`;
    const upperCase = `${provider.toUpperCase()}#${account}`;

    // add messenger
    const addRes = await apolloTestServer.executeOperation(
      { query: ADD_MESSENGER, variables: { provider, account } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(addRes, 'data', {
      addMessenger: expect.objectContaining({
        ...expectedUserFormat,
        messengers: [...user.messengers, lowercase], // lower case for unverified
      }),
    });

    // confirm token is generated in VerificationToken collection
    const originalToken = await VerificationToken.findOne({ user: user._id, messenger: lowercase }).lean();
    expect(originalToken!.user.toString()).toEqual(user._id.toString());
    expect(originalToken!.messenger).toBe(lowercase);

    // simulating resending verification token
    const sendVerificationRes = await apolloTestServer.executeOperation(
      { query: SEND_MESSENGER_VERIFICATION, variables: { provider, account } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(sendVerificationRes, 'data', { sendMessengerVerification: { code: MSG_ENUM.COMPLETED } });

    const updatedToken = await VerificationToken.findOne({ user: user._id, messenger: lowercase }).lean();
    expect(
      !originalToken!._id.equals(updatedToken!._id) &&
        originalToken!.token !== updatedToken!.token &&
        updatedToken &&
        user._id.equals(updatedToken.user) &&
        updatedToken.messenger === lowercase,
    ).toBeTrue();

    // verify messenger
    const verifyRes = await apolloTestServer.executeOperation(
      { query: VERIFY_MESSENGER, variables: { provider, account, token: updatedToken!.token } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(verifyRes, 'data', {
      verifyMessenger: expect.objectContaining({
        ...expectedUserFormat,
        messengers: [...user.messengers, upperCase], // upper case for verified
      }),
    });

    // remove messenger
    const removeRes = await apolloTestServer.executeOperation(
      { query: REMOVE_MESSENGER, variables: { provider, account } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(removeRes, 'data', {
      removeMessenger: expect.objectContaining({ ...expectedUserFormat, messengers: user.messengers }),
    });
  });

  test('should pass when add & remove paymentMethod', async () => {
    expect.assertions(2);

    // add paymentMethod
    const payment = {
      currency: 'HKD',
      account: randomString(),
      payable: prob(0.5),
      receivable: prob(0.5),
      ...(prob(0.5) && { bank: 'HSBC' }),
    };
    const addRes = await apolloTestServer.executeOperation<{ addPaymentMethod: UserDocument }>(
      { query: ADD_PAYMENT_METHOD, variables: { ...payment } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(addRes, 'data', {
      addPaymentMethod: expect.objectContaining({
        ...expectedUserFormat,
        paymentMethods: [...user.paymentMethods, { _id: expectedIdFormat, ...payment, bank: payment.bank || null }],
      }),
    });

    // remove paymentMethod
    const id =
      addRes.body.kind === 'single'
        ? addRes.body.singleResult.data!.addPaymentMethod.paymentMethods.at(-1)?._id.toString()
        : null;
    const removeRes = await apolloTestServer!.executeOperation(
      { query: REMOVE_PAYMENT_METHOD, variables: { id: id! } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(removeRes, 'data', {
      removePaymentMethod: expect.objectContaining({
        ...expectedUserFormat,
        paymentMethods: user.paymentMethods,
      }),
    });
  });

  test('should pass when add & remove avatar', async () => {
    expect.assertions(2);

    // add avatarUrl
    const url = await jestPutObject(user._id);
    const addRes = await apolloTestServer.executeOperation(
      { query: UPDATE_AVATAR, variables: { avatarUrl: url } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(addRes, 'data', { updateAvatar: expect.objectContaining({ ...expectedUserFormat, avatarUrl: url }) });

    // remove avatarUrl
    const removeRes = await apolloTestServer.executeOperation(
      { query: UPDATE_AVATAR },
      { contextValue: apolloContext(user) },
    ); // pass in NO avatarUrl (to remove)
    apolloExpect(removeRes, 'data', {
      updateAvatar: expect.objectContaining({ ...expectedUserFormat, avatarUrl: null }),
    });

    await jestRemoveObject(url); // clean up
  });

  test('should pass when add & remove stash', async () => {
    expect.assertions(2);

    const url = await jestPutObject(user._id);
    const add = { title: FAKE, secret: FAKE2, url };
    const addRes = await apolloTestServer.executeOperation<{ addStash: UserDocument }>(
      { query: ADD_STASH, variables: add },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(addRes, 'data', {
      addStash: expect.objectContaining({
        ...expectedUserFormat,
        stashes: [...user.stashes, { _id: expectedIdFormat, ...add }],
      }),
    });

    const id =
      addRes.body.kind === 'single' ? addRes.body.singleResult.data!.addStash.stashes.at(-1)?._id.toString() : null;
    const removeRes = await apolloTestServer.executeOperation(
      { query: REMOVE_STASH, variables: { id: id! } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(removeRes, 'data', {
      removeStash: expect.objectContaining({ ...expectedUserFormat, stashes: user.stashes }),
    });

    await jestRemoveObject(url); // clean up
  });

  test('should pass when update locale', async () => {
    expect.assertions(2);

    let locale = randomItem(Object.keys(SYSTEM.LOCALE).filter(l => l !== DEFAULTS.USER.LOCALE));
    const res1 = await apolloTestServer.executeOperation(
      { query: UPDATE_LOCALE, variables: { locale } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res1, 'data', { updateLocale: expect.objectContaining({ ...expectedUserFormat, locale }) });

    locale = DEFAULTS.USER.LOCALE;
    const res2 = await apolloTestServer.executeOperation(
      { query: UPDATE_LOCALE, variables: { locale } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res2, 'data', { updateLocale: expect.objectContaining({ ...expectedUserFormat, locale }) });
  });

  test('should pass when update availability', async () => {
    expect.assertions(2);

    const availability = randomItem(
      Object.keys(USER.AVAILABILITY).filter(x => x !== USER.AVAILABILITY.ONLINE && x !== USER.AVAILABILITY.OFFLINE),
    );
    const res1 = await apolloTestServer!.executeOperation(
      { query: UPDATE_AVAILABILITY, variables: { availability } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res1, 'data', {
      updateAvailability: expect.objectContaining({ ...expectedUserFormat, availability }),
    });

    // $unset availability
    const res2 = await apolloTestServer!.executeOperation(
      { query: UPDATE_AVAILABILITY, variables: {} },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res2, 'data', {
      updateAvailability: expect.objectContaining({ ...expectedUserFormat, availability: null }),
    });
  });

  test('should pass when update profile', async () => {
    expect.assertions(2);

    const update = {
      name: FAKE,
      formalName: { enUS: FAKE, zhHK: FAKE2, zhCN: FAKE },
      yob: 2010 + Math.floor(Math.random() * 10),
      dob: new Date(),
    };

    const res1 = await apolloTestServer.executeOperation(
      { query: UPDATE_PROFILE, variables: update },
      { contextValue: apolloContext(user) },
    );
    const dob = update.dob.getTime(); // cast to number
    apolloExpect(res1, 'data', { updateProfile: expect.objectContaining({ ...expectedUserFormat, ...update, dob }) });

    // clear out profile (except name is not clearable)
    const res2 = await apolloTestServer.executeOperation(
      { query: UPDATE_PROFILE, variables: { name: FAKE } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res2, 'data', {
      updateProfile: expect.objectContaining({ ...expectedUserFormat, formalName: null, yob: null, dob: null }),
    });
  });
});
