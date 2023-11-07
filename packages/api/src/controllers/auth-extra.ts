/**
 * Controller: Auth-Extra
 *
 * authController is already too long, break out some functions to this file
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { userMessengerSchema } from '@argonne/common/src/validators';
import type { Request, RequestHandler } from 'express';
import type { Types, UpdateQuery } from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import type { UserDocument } from '../models/user';
import User, { activeCond, userNormalSelect } from '../models/user';
import VerificationToken from '../models/verification-token';
import { mongoId } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import mail from '../utils/sendmail';
import storage from '../utils/storage';
import token, { API_KEY_TOKEN_PREFIX, EMAIL_TOKEN_PREFIX } from '../utils/token';
import oAuth2Decode from './auth-oauth2';
import type { StatusResponse } from './common';
import common from './common';

// patch actions
type Action =
  | 'addApiKey'
  | 'addEmail'
  | 'addMessenger'
  | 'addPaymentMethod'
  | 'addPushSubscription'
  | 'addStash'
  | 'oAuth2Link'
  | 'oAuth2Unlink'
  | 'removeApiKey'
  | 'removeEmail'
  | 'removeMessenger'
  | 'removePaymentMethod'
  | 'removeStash'
  | 'removePushSubscriptions' // remove ALL push subscription
  | 'updateAvatar'
  | 'updateLocale'
  | 'updateAvailability'
  | 'updateProfile'
  | 'verifyEmail'
  | 'verifyMessenger';

export type GetExtraAction = 'isEmailAvailable' | 'listApiKeys';
export type PostExtraAction = 'sendEmailVerification' | 'sendMessengerVerification';

const { MSG_ENUM } = LOCALE;
const { MESSENGER, SYSTEM, USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authGetUser } = common;
const {
  emailSchema,
  idSchema,
  oAuth2IdSchema,
  oAuth2Schema,
  stashSchema,
  tokenSchema,
  userApiKeySchema,
  userAvailabilitySchema,
  userAvatarSchema,
  userLocaleSchema,
  userPaymentMethodsSchema,
  userProfileSchema,
  userPushSubscriptionSchema,
} = yupSchema;

const { config } = configLoader;

/**
 * (helper) partially hide token value except showId
 */
const hideApiKeysToken = (apiKeys: UserDocument['apiKeys'], showId?: Types.ObjectId): UserDocument['apiKeys'] =>
  apiKeys.map(({ _id, token, ...rest }) => ({
    _id,
    ...rest,
    token: showId && _id.equals(showId) ? token : `*****${token.slice(5, 25)}*****...`,
  }));

/**
 * Is Email Available
 */
export const isEmailAvailable = async (req: Request, args: unknown): Promise<boolean> => {
  const { email } = await emailSchema.validate(args);
  const user = await User.exists({ emails: { $in: [email, email.toUpperCase()] }, ...activeCond }).lean();
  return !user;
};

/**
 * List ApiKeys
 */
export const listApiKeys = async (req: Request): Promise<UserDocument['apiKeys']> => {
  const { apiKeys } = await authGetUser(req);
  return hideApiKeysToken(apiKeys);
};

/**
 * Add ApiKey
 */
export const addApiKey = async (req: Request, args: unknown): Promise<UserDocument['apiKeys']> => {
  const [user, { expireAt, scope, note }] = await Promise.all([authGetUser(req), userApiKeySchema.validate(args)]);
  if (expireAt < new Date()) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const _id = mongoId();
  const apiKeyToken = await token.signStrings(
    [API_KEY_TOKEN_PREFIX, user._id, scope],
    Math.floor((expireAt.getTime() - Date.now()) / 1000),
  );

  const update: UpdateQuery<UserDocument> = {
    $push: { apiKeys: { _id, token: apiKeyToken, expireAt, scope, note } },
  };

  const [updatedUser] = await Promise.all([
    User.findOneAndUpdate({ _id: user._id }, update, { new: true }).lean(),
    DatabaseEvent.log(user._id, `/auth/${user._id}`, 'addApiKey', { args }),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-RENEW-TOKEN' },
      {
        bulkWrite: { users: [{ updateOne: { filter: { _id: user._id }, update } }] satisfies BulkWrite<UserDocument> },
      },
    ),
  ]);

  if (updatedUser) return hideApiKeysToken(updatedUser.apiKeys, _id);
  log('error', `authExtraController:addApiKey()`, args, user._id);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Remove Api Key
 */
export const removeApiKey = async (req: Request, args: unknown): Promise<UserDocument['apiKeys']> => {
  const [user, { id }] = await Promise.all([authGetUser(req), idSchema.validate(args)]);

  const originalApiKey = user.apiKeys.find(p => p._id.equals(id));
  if (!originalApiKey) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const update: UpdateQuery<UserDocument> = { $pull: { apiKeys: { _id: id } } };
  const [updatedUser] = await Promise.all([
    User.findOneAndUpdate({ _id: user._id }, update, { new: true }).lean(),
    DatabaseEvent.log(user._id, `/auth/${user._id}`, 'removeApiKey', { originalApiKey }),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-RENEW-TOKEN' },
      {
        bulkWrite: { users: [{ updateOne: { filter: { _id: user._id }, update } }] satisfies BulkWrite<UserDocument> },
      },
    ),
  ]);

  if (updatedUser) return hideApiKeysToken(updatedUser.apiKeys);
  log('error', `authExtraController:removeApiKey()`, args, user._id);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  //
};

/**
 * Request to Send Email Verification
 */
export const sendEmailVerification = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const [user, { email }] = await Promise.all([authGetUser(req), emailSchema.validate(args)]);

  // email should be in emails
  if (!user.emails.map(e => e.toLowerCase()).includes(email.toLowerCase()))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  if (await mail.confirmEmail(user.name, user.locale, email)) return { code: MSG_ENUM.COMPLETED };

  throw { statusCode: 400, code: MSG_ENUM.SENDMAIL_ERROR };
};

/**
 * Request to Send Messenger Verification
 */
export const sendMessengerVerification = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const [user, { provider, account }] = await Promise.all([authGetUser(req), userMessengerSchema.validate(args)]);

  // email should be in emails
  if (!user.messengers.map(m => m.toUpperCase()).includes(`${provider}#${account}`.toUpperCase()))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const token = await VerificationToken.send(user._id, provider, account);
  if (token) return { code: MSG_ENUM.COMPLETED };

  throw { statusCode: 400, code: MSG_ENUM.SENDMAIL_ERROR };
};

/**
 * Update User (by user himself)
 */
export const update = async (
  req: Request,
  args: unknown,
  action: Exclude<Action, 'addApiKey' | 'removeApiKey' | 'verifyEmail'>, // verifyEmail() return Promise<StatusResponse> instead of Promise<UserDocument >
): Promise<UserDocument> => {
  const original = await authGetUser(req);
  const userId = original._id;

  // common code to save update, and notifyAndSync()
  const common = async (
    update: UpdateQuery<UserDocument>,
    event: Record<string, unknown>,
    minio?: { addObject?: string; removeObject?: string },
  ) => {
    const [updatedUser] = await Promise.all([
      User.findByIdAndUpdate(userId, update, { fields: userNormalSelect, new: true }).lean(),
      DatabaseEvent.log(userId, `/auth/${userId}`, action || 'update', event),
      notifySync(
        original.tenants[0] || null,
        { userIds: [userId], event: 'AUTH-RENEW-TOKEN' },
        {
          bulkWrite: {
            users: [{ updateOne: { filter: { _id: userId }, update } }] satisfies BulkWrite<UserDocument>,
          },
          ...((minio?.addObject || minio?.removeObject) && {
            minio: {
              serverUrl: config.server.minio.serverUrl,
              ...(minio.addObject && { addObjects: [minio.addObject] }),
              ...(minio.removeObject && { removeObjects: [minio.removeObject] }),
            },
          }),
        },
      ), // renew-token to reload updated user
    ]);

    if (updatedUser) return updatedUser;
    log('error', `authExtraController:${action}()`, args, userId);
    throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
  };

  if (action === 'addEmail') {
    const { email } = await emailSchema.validate(args);
    if (original.emails.map(e => e.toLowerCase()).includes(email.toLowerCase()))
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    mail.confirmEmail(original.name, original.locale, email); // no need to wait, sending email takes time
    return common({ $addToSet: { emails: email.toUpperCase() } }, { email });
    //
  } else if (action === 'addMessenger') {
    const { provider, account } = await userMessengerSchema.validate(args);

    if (
      !Object.keys(MESSENGER.PROVIDER).includes(provider.toUpperCase()) ||
      original.messengers.map(m => m.toLowerCase()).includes(`${provider}#${account}`.toLowerCase())
    )
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // mixed cased accounts are treated as duplicated

    VerificationToken.send(original._id, provider, account); // send token (no need to await, it will take time to send)
    return common(
      { $addToSet: { messengers: `${provider.toLowerCase()}#${account}` } }, // lowercased provider for unverified
      { provider, account },
    );
    //
  } else if (action === 'addPaymentMethod') {
    const inputFields = await userPaymentMethodsSchema.validate(args);
    const hasDuplicated = original.paymentMethods.some(
      p => p.bank === inputFields.bank && p.currency === inputFields.currency && p.account === inputFields.account,
    );
    if (hasDuplicated) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    return common({ $push: { paymentMethods: { _id: mongoId(), ...inputFields } } }, inputFields);
    //
  } else if (action === 'addPushSubscription') {
    const inputFields = await userPushSubscriptionSchema.validate(args);
    if (original.pushSubscriptions.map(s => JSON.stringify(s)).includes(JSON.stringify(inputFields)))
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // duplicated entry
    return common({ $push: { pushSubscriptions: inputFields } }, inputFields);
    //
  } else if (action === 'addStash') {
    const inputFields = await stashSchema.validate(args);
    await storage.validateObject(inputFields.url, userId);
    return common({ $push: { stashes: { _id: mongoId(), ...inputFields } } }, inputFields);
    //
  } else if (action === 'oAuth2Link') {
    const { provider, code } = await oAuth2Schema.validate(args);
    if (!Object.keys(USER.OAUTH2.PROVIDER).includes(provider))
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    const oAuthPayload = await oAuth2Decode(provider, code);
    const oAuthId = `${provider}#${oAuthPayload.subId}`;
    const isOAuthTaken = await User.findOne({ _id: { $ne: original._id }, oAuth2s: oAuthId, ...activeCond }).lean();

    if (!original.oAuth2s.includes(oAuthId)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // oAuth already set
    if (isOAuthTaken) throw { statusCode: 400, code: MSG_ENUM.AUTH_OAUTH_ALREADY_REGISTERED };

    // download avatar from external URL to localStorage
    const avatarUrl =
      !original.avatarUrl && !!oAuthPayload.avatarUrl && (await storage.downloadFromUrlAndSave(oAuthPayload.avatarUrl));

    const update: UpdateQuery<UserDocument> = {
      ...(oAuthPayload.email && {
        emails: Array.from(
          new Set([
            ...original.emails.map(e => (e.toLowerCase() === oAuthPayload.email?.toLowerCase() ? e.toLowerCase() : e)), // change to verified email
            oAuthPayload.email.toLowerCase(),
          ]),
        ),
      }),
      ...(avatarUrl && { avatarUrl }),
      $addToSet: { oAuth2s: oAuthId },
    };
    return common(update, { provider, oAuthId });
    //
  } else if (action === 'oAuth2Unlink') {
    const { oAuthId } = await oAuth2IdSchema.validate(args);
    if (!original.oAuth2s.includes(oAuthId)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    return common({ $pull: { oAuth2s: oAuthId } }, { oAuthId });
    //
  } else if (action === 'removeEmail') {
    const { email } = await emailSchema.validate(args);
    if (!original.emails.map(e => e.toLowerCase()).includes(email.toLowerCase()))
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    return common({ $pull: { emails: { $in: [email, email.toUpperCase()] } } }, { email });
    //
  } else if (action === 'removeMessenger') {
    const { provider, account } = await userMessengerSchema.validate(args);
    if (!original.messengers.map(m => m.toLowerCase()).includes(`${provider}#${account}`.toLowerCase()))
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    return common(
      {
        $pull: {
          messengers: { $in: [`${provider.toLowerCase()}#${account}`, `${provider.toUpperCase()}#${account}`] },
        },
      },
      { provider, account },
    );
    //
  } else if (action === 'removePaymentMethod') {
    const { id } = await idSchema.validate(args);
    const originalPaymentMethod = original.paymentMethods.find(p => p._id.equals(id));
    if (!originalPaymentMethod) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    return common({ $pull: { paymentMethods: { _id: id } } }, { original: originalPaymentMethod });
    //
  } else if (action === 'removePushSubscriptions') {
    return common({ pushSubscriptions: [] }, { original: original.pushSubscriptions });
    //
  } else if (action === 'removeStash') {
    const { id } = await idSchema.validate(args);
    const originalStash = original.stashes.find(s => s._id.equals(id));
    if (!originalStash) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    await storage.removeObject(originalStash.url);
    return common({ $pull: { stashes: { _id: id } } }, { original: originalStash });
    //
  } else if (action === 'updateAvailability') {
    const { availability } = await userAvailabilitySchema.validate(args);

    if (
      !!availability &&
      !Object.keys(USER.AVAILABILITY)
        .filter(x => x !== USER.AVAILABILITY.ONLINE && x !== USER.AVAILABILITY.OFFLINE) // ONLINE & OFFLINE are not selectable
        .includes(availability)
    )
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // make no sense to set OFFLINE (auto-detected by socket-server)

    return common(availability ? { availability } : { $unset: { availability: 1 } }, { availability });
    //
  } else if (action === 'updateAvatar') {
    const { avatarUrl } = await userAvatarSchema.validate(args);

    const [addObject, removeObject] = await Promise.all([
      original.avatarUrl !== avatarUrl &&
        avatarUrl &&
        storage.validateObject(avatarUrl, userId, avatarUrl.startsWith('avatar-')), // 'avatar-' is built-in avatarUrl, no need to check PreSignedUrl ownership
      original.avatarUrl &&
        original.avatarUrl !== avatarUrl &&
        !original.avatarUrl.startsWith('avatarUrl-') &&
        storage.removeObject(original.avatarUrl), // remove old avatarUrl from minio if exists and is different from new avatarUrl (& non built-in avatar)
    ]);

    return common(
      avatarUrl ? { avatarUrl } : { $unset: { avatarUrl: 1 } },
      { original: original.avatarUrl, update: avatarUrl },
      { ...(addObject && { addObject }), ...(removeObject && { removeObject }) },
    );

    //
  } else if (action === 'updateLocale') {
    const { locale } = await userLocaleSchema.validate(args);
    if (!Object.keys(SYSTEM.LOCALE).includes(locale)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // re-verify locale value (YUP has verified already)
    return common({ locale }, { original: original.locale, new: locale });
    //
  } else if (action === 'verifyMessenger') {
    const { userId } = auth(req);
    const { token: confirmToken, provider, account } = await tokenSchema.concat(userMessengerSchema).validate(args);

    const lowerCase = `${provider.toLowerCase()}#${account}`;
    const upperCase = `${provider.toUpperCase()}#${account}`;

    const verificationToken = await VerificationToken.findOneAndUpdate(
      { user: userId, messenger: lowerCase },
      { $inc: { attempt: 1 } },
    ).lean();

    if (!original.messengers.includes(lowerCase) || verificationToken?.token !== confirmToken)
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    // const update = { $addToSet: { messengers: upperCase }, $pull: { messengers: lowerCase } }; // Updating the path 'messengers' would create a conflict at 'messengers'
    const update: UpdateQuery<UserDocument> = {
      messengers: original.messengers.filter(m => m !== lowerCase).concat(upperCase), // remove unverified, append verified
    };
    const [updatedUser] = await Promise.all([
      common(update, { provider, account }),
      VerificationToken.deleteOne({ _id: verificationToken._id }),
    ]);
    return updatedUser;
    //
  } else if (action === 'updateProfile') {
    const inputFields = await userProfileSchema.validate(args);

    const unset = {
      ...(!inputFields.formalName && { formalName: 1 }),
      ...(!inputFields.yob && { yob: 1 }),
      ...(!inputFields.dob && { dob: 1 }),
    };

    const { name, formalName, yob, dob } = original;

    return common(
      {
        name: inputFields.name,
        ...(inputFields.formalName && { formalName: inputFields.formalName }),
        ...(inputFields.yob && { yob: inputFields.yob }),
        ...(inputFields.dob && { dob: inputFields.dob }),
        ...(Object.keys(unset).length && { $unset: unset }),
      },
      { original: { name, formalName, yob, dob }, update: inputFields },
    );
  } else {
    return assertUnreachable(action);
  }
};

/**
 * Verify Email
 * note: user might NOT have logged in yet, so only return StatusResponse
 */
export const verifyEmail = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { token: confirmToken } = await tokenSchema.validate(args);
  const [prefix, email] = await token.verifyStrings(confirmToken);
  if (prefix !== EMAIL_TOKEN_PREFIX || !email) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  // mongodb does not allow $pull & $push on the same key (emails in this case)
  // const update: UpdateQuery<UserDocument> = {
  //   $addToSet: { emails: email.toLowerCase() }, // $push verified email
  //   $pull: { emails: email.toUpperCase() }, // $pull unverified email
  // };

  const user = await User.findOneAndUpdate(
    { emails: { $in: [email, email.toUpperCase()] } },
    { $pull: { emails: email.toUpperCase() } }, // remove unverified email
    { new: true },
  ).lean();

  if (!user) throw { statusCode: 422, code: MSG_ENUM.TOKEN_ERROR };

  const update: UpdateQuery<UserDocument> = { emails: [...user.emails, email.toLowerCase()] }; // finally append verified email

  await Promise.all([
    User.updateOne({ _id: user._id }, { $addToSet: { emails: email.toLowerCase() } }), // add back verified email
    DatabaseEvent.log(user._id, `/auth/${user._id}`, 'verify', { email }),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-RENEW-TOKEN' },
      {
        bulkWrite: {
          users: [
            { updateOne: { filter: { _id: user._id }, update: { $pull: { emails: email.toUpperCase() } } } }, // remove unverified
            { updateOne: { filter: { _id: user._id }, update: { $addToSet: { emails: email.toLowerCase() } } } }, // add back verified
          ] satisfies BulkWrite<UserDocument>,
        },
      },
    ),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Patch Action (RESTful)
 */
export const updateHandler: RequestHandler<{ action: Action }> = async (req, res, next) => {
  const { action } = req.params;
  try {
    switch (action) {
      case 'verifyEmail':
        return res.status(200).json(await verifyEmail(req, req.body));
      case 'addApiKey':
        return res.status(200).json({ data: await addApiKey(req, req.body) });
      case 'removeApiKey':
        return res.status(200).json({ data: await removeApiKey(req, req.body) });
      default:
        return res.status(200).json({ data: await update(req, req.body, action) });
    }
  } catch (error) {
    next(error);
  }
};
