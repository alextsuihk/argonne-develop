/**
 * Token Management (emulate as session)
 *
 */

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';
import jwt from 'jsonwebtoken';
import type { LeanDocument, Types } from 'mongoose';

import configLoader from '../config/config-loader';
import type { TokenDocument } from '../models/token';
import Token from '../models/token';
import type { UserDocument } from '../models/user';
import { isStagingMode, isTestMode } from './environment';
import { idsToString } from './helper';
import { notify } from './messaging';

type ApiPayload = {
  userId: string;
  scope: string;
};
export type Auth = {
  userExtra?: { year: string; school: string; level: string; schoolClass?: string };
  userFlags: string[];
  userId: string;
  userLocale: string;
  userName: string;
  userRoles: string[];
  userScopes: string[];
  userTenants: string[];
  authUserId?: string;
};

type Extra = {
  ip: string;
  ua: string;
  isPublic?: boolean;
  expiresIn?: number;
  authUserId?: string;
  force?: boolean;
};

type Event = 'contact' | 'email' | 'login' | 'password' | 'tenant';

type AuthPayload = Auth & Extra & { jest?: number };
type RefreshPayload = { userId: string; jest?: number };
type EventPayload = { id: string; event: Event };

export type TokensResponseConflict = { conflict: { ip?: string; maxLogin?: number; exceedLogin?: number } };
export type TokensResponseSuccessful = {
  accessToken: string;
  accessTokenExpireAt: Date;
  refreshToken: string;
  refreshTokenExpireAt: Date;
};

const { MSG_ENUM } = LOCALE;
const { config, DEFAULTS } = configLoader;
const { jwtSecret } = config;

/**
 * Create Access & Refresh Tokens
 */
const createTokens = async (user: LeanDocument<UserDocument>, extra: Extra): Promise<TokensResponseSuccessful> => {
  const { _id, flags, histories, locale, name, roles, scopes, tenants } = user;
  const { ip, ua, isPublic, expiresIn, authUserId } = extra;

  // generate access & refresh token
  const accessExpiresIn = Math.min(DEFAULTS.JWT.EXPIRES.ACCESS, expiresIn ?? DEFAULTS.JWT.EXPIRES.ACCESS);
  const accessTokenExpireAt = addSeconds(Date.now(), accessExpiresIn - 5); // reduce 5-seconds for safety

  // in case of isPublic, refreshToken is short live (access keep renewing)
  const refreshExpiresIn = expiresIn ?? isPublic ? DEFAULTS.JWT.EXPIRES.ACCESS + 60 : DEFAULTS.JWT.EXPIRES.REFRESH;
  const refreshTokenExpireAt = addSeconds(Date.now(), refreshExpiresIn - 5); // reduce 5-seconds for safety

  const jest = isStagingMode || isTestMode ? new Date().getMilliseconds() : undefined; // avoid duplicated JWT when 2 logins within 1 second (for Jest)

  const payload: AuthPayload = {
    userId: _id.toString(),
    userFlags: flags,
    userLocale: locale,
    userName: name,
    userRoles: roles,
    userScopes: scopes,
    userTenants: idsToString(tenants),
    ...(histories[0] && {
      userExtra: {
        year: histories[0].year,
        school: histories[0].school.toString(),
        level: histories[0].level.toString(),
        ...(histories[0].schoolClass && { schoolClass: histories[0].schoolClass }),
      },
    }),
    authUserId,
    ip,
    ua,
    jest,
  };
  const [accessToken, refreshToken] = await Promise.all([
    sign(payload, accessExpiresIn),
    sign({ userId: _id.toString(), jest }, refreshExpiresIn),
  ]);

  return { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt };
};

/**
 * Decode Auth Token
 */
const decodeAuth = async (token: string): Promise<Auth> => verify<Auth>(token, true);

/**
 * Decode Api Token
 */
const decodeApi = async (token: string): Promise<ApiPayload> => verify<ApiPayload>(token);

/**
 * Generate tokens (access + refresh)
 */
interface Generate {
  <T extends boolean>(user: LeanDocument<UserDocument>, extra: Omit<Extra, 'force'> & { force: T }): Promise<
    T extends true ? TokensResponseSuccessful : TokensResponseSuccessful | TokensResponseConflict
  >;
  (user: LeanDocument<UserDocument>, extra: Extra): Promise<TokensResponseSuccessful | TokensResponseConflict>;
}

const generate: Generate = async (user: LeanDocument<UserDocument>, extra: Extra) => {
  const { ip, ua, authUserId, force } = extra;
  try {
    // if exceed maxLogin, void (kick out) old tokens
    const tokens = await Token.find({ user: user._id, expireAt: { $gte: new Date() } })
      .sort({ createdAt: -1 })
      .lean();

    const excessTokens = tokens.slice(DEFAULTS.AUTH.MAX_LOGIN - 1);

    const recentIp = tokens[0]?.ip;
    const differentIp = !!(DEFAULTS.AUTH.SAME_IP_LOGIN_ONLY && recentIp && recentIp !== ip);

    if (!force && (excessTokens.length || differentIp))
      return {
        conflict: {
          ...(differentIp && { ip: recentIp }),
          ...(excessTokens.length && { maxLogin: DEFAULTS.AUTH.MAX_LOGIN, exceedLogin: excessTokens.length }),
        },
      };

    // generate access & refresh tokens
    const { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt } = await createTokens(user, extra);

    await Promise.all([
      excessTokens.length && Token.deleteMany({ _id: { $in: excessTokens } }),
      Token.create({ user, token: refreshToken, expireAt: refreshTokenExpireAt, ip, ua, authUser: authUserId }),
      differentIp ? await revokeOthers(user._id, refreshToken) : await notify([user._id], 'RE-AUTH'), // re-auth user in case multiple tab in same browser (or excessTokens)
    ]);

    return { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt };
  } catch (error) {
    throw { ...(error instanceof Error ? { message: error.message } : {}), code: MSG_ENUM.AUTH_CREATE_TOKEN_ERROR };
  }
};

/**
 * Generate API-Key tokens
 */
const generateApi = async (payload: ApiPayload, expiresIn: number | string): Promise<string> =>
  sign(payload, expiresIn);

/**
 * List valid token of an user
 */
const list = async (userId: string | Types.ObjectId): Promise<TokenDocument[]> => {
  try {
    const select = '_id authUser ip ua updatedAt';
    return Token.find({ user: userId, expireAt: { $gte: new Date() } }, select, { sort: { createdAt: 1 } }).lean();
  } catch (error) {
    throw {
      ...(error instanceof Error ? { message: error.message } : {}),
      statusCode: 400,
      code: MSG_ENUM.AUTH_LIST_TOKEN_ERROR,
    };
  }
};

/**
 * Renew Access Token (also renew refreshToken)
 * if refreshToken is still valid, generate new accessToken AND refreshToken, and update Token collection
 */
const renew = async (
  user: LeanDocument<UserDocument>,
  oldRefreshToken: string,
  extra: Extra,
): Promise<TokensResponseSuccessful> => {
  try {
    // TODO: if userAgent not match Token document, throw error for re-login
    // generate access & refresh tokens
    const { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt } = await createTokens(user, extra);

    // if oldRefreshToken exists & not expires, update it
    const token = await Token.findOneAndUpdate(
      { user: user._id, token: oldRefreshToken, expireAt: { $gte: new Date() } },
      { token: refreshToken, expireAt: refreshTokenExpireAt },
    ).lean();
    if (!token) throw { statusCode: 400, message: `token ${oldRefreshToken} no longer valid` };

    if (!isStagingMode && !isTestMode) setTimeout(() => notify([user._id], 'LOAD-AUTH'), 100); // ask other client tabs to reload auth from localStorage
    return { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt };
  } catch (error) {
    throw {
      ...(error instanceof Error ? { message: error.message } : error instanceof Object ? error : {}),
      statusCode: 400,
      code: MSG_ENUM.AUTH_RENEW_TOKEN_ERROR,
    };
  }
};

/**
 * Revoke All
 * logout all other devices
 */
const revokeAll = async (userId: string | Types.ObjectId): Promise<void> => {
  try {
    await Promise.all([Token.deleteMany({ user: userId }), notify([userId], 'RE-AUTH')]);
  } catch (error) {
    throw {
      ...(error instanceof Error ? { message: error.message } : {}),
      statusCode: 400,
      code: MSG_ENUM.AUTH_REVOKE_TOKEN_ERROR,
    };
  }
};

/**
 * Revoke Current Token
 * ( Destroy this Session )
 */
const revokeCurrent = async (userId: string | Types.ObjectId, refreshToken: string): Promise<void> => {
  try {
    await Token.deleteOne({ user: userId, token: refreshToken });
    if (!isStagingMode && !isTestMode) setTimeout(() => notify([userId], 'LOAD-AUTH'), 100); // effectively, logout other tabs in same browser
  } catch (error) {
    throw {
      ...(error instanceof Error ? { message: error.message } : {}),
      statusCode: 400,
      code: MSG_ENUM.AUTH_REVOKE_TOKEN_ERROR,
    };
  }
};

/**
 * Revoke All Others JWT
 * (Destroy other Sessions except current token)
 */
const revokeOthers = async (userId: string | Types.ObjectId, refreshToken: string): Promise<number> => {
  try {
    const [{ deletedCount }] = await Promise.all([
      Token.deleteMany({ user: userId, token: { $ne: refreshToken } }),
      notify([userId], 'RE-AUTH'),
    ]);

    return deletedCount;
  } catch (error) {
    throw {
      ...(error instanceof Error ? { message: error.message } : {}),
      statusCode: 400,
      code: MSG_ENUM.AUTH_REVOKE_TOKEN_ERROR,
    };
  }
};

/**
 * Sign Token (with optional expiresIn)
 */
const sign = async (
  payload: ApiPayload | AuthPayload | RefreshPayload | EventPayload | { id: string },
  expiresIn: number | string,
  secret = jwtSecret,
): Promise<string> =>
  new Promise<string>((resolve, reject) =>
    jwt.sign(payload, secret, { noTimestamp: true, expiresIn }, (_, token) => (token ? resolve(token) : reject())),
  );

/**
 * Sign Contents Token
 */
export const signContentIds = async (
  userId: string | Types.ObjectId,
  contentIds: (string | Types.ObjectId)[],
  secret = jwtSecret,
): Promise<string> =>
  new Promise<string>((resolve, reject) =>
    jwt.sign({ userId, contentIds }, secret, { noTimestamp: true }, (_, token) => (token ? resolve(token) : reject())),
  );

/**
 * Sign Event Token
 */
const signEvent = async (id: string | Types.ObjectId, event: Event, expiresIn: number | string): Promise<string> =>
  sign({ id: id.toString(), event }, expiresIn);

/**
 * Verify & Decode JWT
 */
const verify = async <T>(token: string, isDecodeAuth = false): Promise<T> =>
  new Promise<T>((resolve, reject) =>
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (decoded && !err) resolve(decoded as T);

      if (isDecodeAuth) reject({ statusCode: 401, code: MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR });
      switch (err instanceof Error && err.name) {
        case 'TokenExpiredError':
          reject({ statusCode: 400, code: MSG_ENUM.TOKEN_EXPIRED });
          break;
        case 'JsonWebTokenError':
        case 'SyntaxError':
          reject({ statusCode: 400, code: MSG_ENUM.TOKEN_ERROR });
          break;
        default:
          reject({ statusCode: 500, code: MSG_ENUM.TOKEN_ERROR });
      }
    }),
  );

/**
 * Verify & Decode ContentIds
 */
export const verifyContentIds = async (userId: string, id: string, token: string): Promise<void> => {
  const decoded = await verify(token);
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    !('userId' in decoded) ||
    typeof decoded.userId !== 'string' ||
    decoded.userId !== userId ||
    !('contentIds' in decoded) ||
    !Array.isArray(decoded.contentIds) ||
    !decoded.contentIds.includes(id)
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
};

/**
 * Verify & Decode Event Token
 */
const verifyEvent = async (token: string, signingEvent: Event): Promise<{ id: string }> => {
  const { id, event } = await verify<{ id?: string; event?: Event }>(token);
  if (!id || event !== signingEvent) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };
  return { id };
};

export default {
  decodeAuth,
  decodeApi,
  generate,
  generateApi,
  list,
  renew,
  revokeAll,
  revokeCurrent,
  revokeOthers,
  sign,
  signContentIds,
  signEvent,
  verify,
  verifyContentIds,
  verifyEvent,
};
