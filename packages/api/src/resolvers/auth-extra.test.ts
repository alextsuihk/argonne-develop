// TODO: IMPERSONATE_START, IMPERSONATE_STOP, LOGIN_WITH_STUDENT_ID, OAUTH2, OAUTH2_CONNECT, OAUTH2_DISCONNECT,

/**
 * Jest: /resolvers/auth-extra
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import configLoader from '../config/config-loader';
import {
  apolloExpect,
  ApolloServer,
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
  let guestServer: ApolloServer | null;
  let normalUser: UserDocument | null;
  let normalServer: ApolloServer | null;
  let url: string | undefined;

  beforeAll(async () => {
    ({ guestServer, normalServer, normalUser } = await jestSetup(['guest', 'normal'], { apollo: true }));
  });
  afterAll(async () => Promise.all([url && jestRemoveObject(url), jestTeardown()]));

  console.log('WIP: REMOVE_PUSH_SUBSCRIPTIONS, OAUTH2_LINK & OAUTH2_UNLINK (Apollo)');

  test('should pass when add, list and remove apiKey', async () => {
    expect.assertions(3);

    // add apiKey
    const add = { scope: FAKE, expireAt: addDays(Date.now(), 1), ...(prob(0.5) && { note: FAKE2 }) };
    const apiKeys = [
      ...normalUser!.apiKeys.map(api => ({ ...api, token: expect.any(String), note: api.note || null })),
      {
        _id: expectedIdFormat,
        token: expect.any(String),
        scope: add.scope,
        expireAt: add.expireAt.getTime(),
        note: add.note || null,
      },
    ];
    const addRes = await normalServer!.executeOperation({ query: ADD_API_KEY, variables: add });
    apolloExpect(addRes, 'data', { addApiKey: apiKeys });

    // list apiKeys
    const listRes = await normalServer!.executeOperation({ query: LIST_API_KEYS });
    apolloExpect(listRes, 'data', { listApiKeys: apiKeys });

    // remove apiKey
    const id = listRes.data!.listApiKeys.at(-1)._id;
    const removeRes = await normalServer!.executeOperation({ query: REMOVE_API_KEY, variables: { id } });
    apolloExpect(removeRes, 'data', {
      removeApiKey: normalUser!.apiKeys.map(api => ({ ...api, token: expect.any(String), note: api.note ?? null })),
    });
  });

  test('should pass when add, sendVerification, verify & remove email', async () => {
    expect.assertions(6);
    const email = `JEST-${randomString()}@example.com`;

    // add email
    const add1Res = await normalServer!.executeOperation({ query: ADD_EMAIL, variables: { email } });
    apolloExpect(add1Res, 'data', {
      addEmail: expect.objectContaining({
        ...expectedUserFormat,
        emails: [...normalUser!.emails, email.toUpperCase()], // unverified email
      }),
    });

    // remove email
    const remove1Res = await normalServer!.executeOperation({ query: REMOVE_EMAIL, variables: { email } });
    apolloExpect(remove1Res, 'data', {
      removeEmail: expect.objectContaining({ ...expectedUserFormat, emails: normalUser!.emails }), // back to original
    });

    // add2 email
    const add2Res = await normalServer!.executeOperation({ query: ADD_EMAIL, variables: { email } });
    apolloExpect(add2Res, 'data', {
      addEmail: expect.objectContaining({
        ...expectedUserFormat,
        emails: [...normalUser!.emails, email.toUpperCase()],
      }),
    });

    // send verification
    const sendVerificationRes = await normalServer!.executeOperation({
      query: SEND_EMAIL_VERIFICATION,
      variables: { email },
    });
    apolloExpect(sendVerificationRes, 'data', { sendEmailVerification: { code: MSG_ENUM.COMPLETED } });

    // verify email
    const confirmToken = await token.signStrings([EMAIL_TOKEN_PREFIX, email], 5);
    const verifyRes = await guestServer!.executeOperation({ query: VERIFY_EMAIL, variables: { token: confirmToken } });
    apolloExpect(verifyRes, 'data', { verifyEmail: { code: MSG_ENUM.COMPLETED } });

    // remove2 email
    const remove2Res = await normalServer!.executeOperation({ query: REMOVE_EMAIL, variables: { email } });
    apolloExpect(remove2Res, 'data', {
      removeEmail: expect.objectContaining({ ...expectedUserFormat, emails: normalUser!.emails }),
    });
  });

  test('should response true when email is available', async () => {
    expect.assertions(1);

    const email = `JEST-${randomString()}.valid@example.com`;
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

    const INVALID_EMAIL = 'invalid_mail'; // yup thinks invalid@email is valid
    const res = await guestServer!.executeOperation({ query: IS_EMAIL_AVAILABLE, variables: { email: INVALID_EMAIL } });
    apolloExpect(res, 'errorContaining', 'email must be a valid email');
  });

  test('should pass when add, sendVerification, verify & remove messenger', async () => {
    expect.assertions(7);

    const provider = randomItem(Object.keys(MESSENGER.PROVIDER));
    const account = `Abc_${randomString()}`; // mixed cased
    const lowercase = `${provider.toLowerCase()}#${account}`;
    const upperCase = `${provider.toUpperCase()}#${account}`;

    // add messenger
    const addRes = await normalServer!.executeOperation({ query: ADD_MESSENGER, variables: { provider, account } });
    apolloExpect(addRes, 'data', {
      addMessenger: expect.objectContaining({
        ...expectedUserFormat,
        messengers: [...normalUser!.messengers, lowercase], // lower case for unverified
      }),
    });

    // confirm token is generated in VerificationToken collection
    const originalToken = await VerificationToken.findOne({ user: normalUser!._id, messenger: lowercase }).lean();
    expect(originalToken!.user.toString()).toEqual(normalUser!._id.toString());
    expect(originalToken!.messenger).toBe(lowercase);

    // simulating resending verification token
    const sendVerificationRes = await normalServer!.executeOperation({
      query: SEND_MESSENGER_VERIFICATION,
      variables: { provider, account },
    });
    apolloExpect(sendVerificationRes, 'data', { sendMessengerVerification: { code: MSG_ENUM.COMPLETED } });

    const updatedToken = await VerificationToken.findOne({ user: normalUser!._id, messenger: lowercase }).lean();
    expect(
      !originalToken!._id.equals(updatedToken!._id) &&
        originalToken!.token !== updatedToken!.token &&
        updatedToken &&
        normalUser!._id.equals(updatedToken.user) &&
        updatedToken.messenger === lowercase,
    ).toBeTrue();

    // verify messenger
    const verifyRes = await normalServer!.executeOperation({
      query: VERIFY_MESSENGER,
      variables: { provider, account, token: updatedToken!.token },
    });
    apolloExpect(verifyRes, 'data', {
      verifyMessenger: expect.objectContaining({
        ...expectedUserFormat,
        messengers: [...normalUser!.messengers, upperCase], // upper case for verified
      }),
    });

    // remove messenger
    const removeRes = await normalServer!.executeOperation({
      query: REMOVE_MESSENGER,
      variables: { provider, account },
    });
    apolloExpect(removeRes, 'data', {
      removeMessenger: expect.objectContaining({ ...expectedUserFormat, messengers: normalUser!.messengers }),
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
    const addRes = await normalServer!.executeOperation({ query: ADD_PAYMENT_METHOD, variables: { ...payment } });
    apolloExpect(addRes, 'data', {
      addPaymentMethod: expect.objectContaining({
        ...expectedUserFormat,
        paymentMethods: [
          ...normalUser!.paymentMethods,
          { _id: expectedIdFormat, ...payment, bank: payment.bank || null },
        ],
      }),
    });

    // remove paymentMethod
    const id = addRes.data!.addPaymentMethod.paymentMethods.at(-1)._id;
    const removeRes = await normalServer!.executeOperation({ query: REMOVE_PAYMENT_METHOD, variables: { id } });
    apolloExpect(removeRes, 'data', {
      removePaymentMethod: expect.objectContaining({
        ...expectedUserFormat,
        paymentMethods: normalUser!.paymentMethods,
      }),
    });
  });

  test('should pass when add & remove avatar', async () => {
    expect.assertions(2);

    // add avatarUrl
    url = await jestPutObject(normalUser!._id);
    const addRes = await normalServer!.executeOperation({ query: UPDATE_AVATAR, variables: { avatarUrl: url } });
    apolloExpect(addRes, 'data', { updateAvatar: expect.objectContaining({ ...expectedUserFormat, avatarUrl: url }) });

    // remove avatarUrl
    const removeRes = await normalServer!.executeOperation({ query: UPDATE_AVATAR }); // pass in NO avatarUrl (to remove)
    apolloExpect(removeRes, 'data', {
      updateAvatar: expect.objectContaining({ ...expectedUserFormat, avatarUrl: null }),
    });
  });

  test('should pass when add & remove stash', async () => {
    expect.assertions(2);

    const add = {
      title: FAKE,
      secret: FAKE2,
      url: await jestPutObject(normalUser!._id),
    };
    const addRes = await normalServer!.executeOperation({ query: ADD_STASH, variables: add });
    apolloExpect(addRes, 'data', {
      addStash: expect.objectContaining({
        ...expectedUserFormat,
        stashes: [...normalUser!.stashes, { _id: expectedIdFormat, ...add }],
      }),
    });

    const id = addRes.data!.addStash.stashes.at(-1)._id;
    const removeRes = await normalServer!.executeOperation({ query: REMOVE_STASH, variables: { id } });
    apolloExpect(removeRes, 'data', {
      removeStash: expect.objectContaining({ ...expectedUserFormat, stashes: normalUser!.stashes }),
    });
  });

  test('should pass when update locale', async () => {
    expect.assertions(2);

    let locale = randomItem(Object.keys(SYSTEM.LOCALE).filter(l => l !== DEFAULTS.USER.LOCALE));
    const res1 = await normalServer!.executeOperation({ query: UPDATE_LOCALE, variables: { locale } });
    apolloExpect(res1, 'data', { updateLocale: expect.objectContaining({ ...expectedUserFormat, locale }) });

    locale = DEFAULTS.USER.LOCALE;
    const res2 = await normalServer!.executeOperation({ query: UPDATE_LOCALE, variables: { locale } });
    apolloExpect(res2, 'data', { updateLocale: expect.objectContaining({ ...expectedUserFormat, locale }) });
  });

  test('should pass when update availability', async () => {
    expect.assertions(2);

    const availability = randomItem(
      Object.keys(USER.AVAILABILITY).filter(x => x !== USER.AVAILABILITY.ONLINE && x !== USER.AVAILABILITY.OFFLINE),
    );
    const res1 = await normalServer!.executeOperation({ query: UPDATE_AVAILABILITY, variables: { availability } });
    apolloExpect(res1, 'data', {
      updateAvailability: expect.objectContaining({ ...expectedUserFormat, availability }),
    });

    // $unset availability
    const res2 = await normalServer!.executeOperation({ query: UPDATE_AVAILABILITY, variables: {} });
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

    const res1 = await normalServer!.executeOperation({ query: UPDATE_PROFILE, variables: update });
    const dob = update.dob.getTime(); // cast to number
    apolloExpect(res1, 'data', { updateProfile: expect.objectContaining({ ...expectedUserFormat, ...update, dob }) });

    // clear out profile (except name is not clearable)
    const res2 = await normalServer!.executeOperation({ query: UPDATE_PROFILE, variables: { name: FAKE } });
    apolloExpect(res2, 'data', {
      updateProfile: expect.objectContaining({ ...expectedUserFormat, formalName: null, yob: null, dob: null }),
    });
  });
});
