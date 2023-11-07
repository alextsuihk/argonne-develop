/**
 * Token Management (emulate as session)
 *
 */

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import type { TokenDocument } from '../models/token';
import Token from '../models/token';
import type { UserDocument } from '../models/user';
import { latestSchoolHistory, randomString } from './helper';
import { notifySync } from './notify-sync';

export type Auth = {
  userExtra?: ReturnType<typeof latestSchoolHistory>; // UserDocument['schoolHistories'][number] | { school: string; level: string };
  userFlags: string[];
  userId: Types.ObjectId;
  userLocale: string;
  userName: string;
  userRoles: string[];
  userTenants: string[];
  authUserId?: Types.ObjectId;
};

type Extra = {
  ip?: string;
  ua: string;
  isPublic?: boolean;
  expiresIn?: number;
  authUserId?: Types.ObjectId;
  force?: boolean;
};

type AuthPayload = Auth & Extra;
type StringPayload = { data: string };

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

export const API_KEY_TOKEN_PREFIX = 'API_KEY';
export const EMAIL_TOKEN_PREFIX = 'EMAIL';
export const PASSWORD_TOKEN_PREFIX = 'PASSWORD';
export const REFRESH_TOKEN_PREFIX = 'REFRESH';
export const TENANT_BINDING_TOKEN_PREFIX = 'TENANT_BINDING';

/**
 * Create Access & Refresh Tokens
 */
const createTokens = async (user: UserDocument, extra: Extra): Promise<TokensResponseSuccessful> => {
  const { _id, flags, schoolHistories, locale, name, roles, tenants } = user;
  const { ip, ua, isPublic, expiresIn, authUserId } = extra;

  // generate access & refresh token
  const accessExpiresIn = Math.min(DEFAULTS.JWT.EXPIRES.ACCESS, expiresIn ?? DEFAULTS.JWT.EXPIRES.ACCESS);
  const accessTokenExpireAt = addSeconds(Date.now(), accessExpiresIn - 5); // reduce 5-seconds for safety

  // in case of isPublic, refreshToken is short live (access keep renewing)
  const refreshExpiresIn = expiresIn ?? isPublic ? DEFAULTS.JWT.EXPIRES.ACCESS + 60 : DEFAULTS.JWT.EXPIRES.REFRESH;
  const refreshTokenExpireAt = addSeconds(Date.now(), refreshExpiresIn - 5); // reduce 5-seconds for safety

  const payload: AuthPayload = {
    userId: _id,
    userFlags: flags,
    userLocale: locale,
    userName: name,
    userRoles: roles,
    userTenants: tenants.map(t => t.toString()),
    userExtra: latestSchoolHistory(schoolHistories),
    authUserId,
    ip,
    ua,
  };

  const [accessToken, refreshToken] = await Promise.all([
    sign(payload, accessExpiresIn),
    signStrings([REFRESH_TOKEN_PREFIX, _id.toString(), randomString()], refreshExpiresIn), // additional randomString() primarily for JEST testing
  ]);

  return { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt };
};

/**
 * Generate tokens (access + refresh)
 */
type Generate = {
  <T extends boolean>(
    user: UserDocument,
    extra: Omit<Extra, 'force'> & { force: T },
  ): Promise<T extends true ? TokensResponseSuccessful : TokensResponseSuccessful | TokensResponseConflict>;
  (user: UserDocument, extra: Extra): Promise<TokensResponseSuccessful | TokensResponseConflict>;
};

const generate: Generate = async (user: UserDocument, extra: Extra) => {
  const { ip, ua, authUserId, force } = extra;
  try {
    // if exceed maxLogin, void (kick out) old tokens
    const tokens = await Token.find({ user: user._id, expireAt: { $gte: new Date() } })
      .sort({ createdAt: -1 })
      .lean();

    const excessTokens = tokens.slice(DEFAULTS.AUTH.MAX_LOGIN - 1);

    const satelliteIp = tokens[0]?.ip;
    const differentIp = !!(DEFAULTS.AUTH.SAME_IP_LOGIN_ONLY && satelliteIp && satelliteIp !== ip);

    if (!force && (excessTokens.length || differentIp))
      return {
        conflict: {
          ...(differentIp && { ip: satelliteIp }),
          ...(excessTokens.length && { maxLogin: DEFAULTS.AUTH.MAX_LOGIN, exceedLogin: excessTokens.length }),
        },
      };

    // generate access & refresh tokens
    const { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt } = await createTokens(user, extra);

    await Promise.all([
      excessTokens.length && Token.deleteMany({ _id: { $in: excessTokens } }),
      Token.create<Partial<TokenDocument>>({
        user: user._id,
        token: refreshToken,
        expireAt: refreshTokenExpireAt,
        ip,
        ua,
        ...(authUserId && { authUser: authUserId }),
      }),
      differentIp && revokeOthers(user._id, refreshToken),
      differentIp &&
        notifySync(
          user.tenants[0] || null,
          { userIds: [user._id], event: 'AUTH-RENEW-TOKEN' },
          { extra: { revokeAllTokensByUserId: user._id } },
        ), // force other clients to renew (logout), also kick out in satellite
    ]);

    return { accessToken, accessTokenExpireAt, refreshToken, refreshTokenExpireAt };
  } catch (error) {
    throw {
      statusCode: 400,
      code: MSG_ENUM.AUTH_CREATE_TOKEN_ERROR,
      ...(error instanceof Error && { message: error.message }),
    };
  }
};

/**
 * List valid token of an user
 */
const list = async (userId: Types.ObjectId): Promise<TokenDocument[]> => {
  try {
    const select = '_id authUser ip ua updatedAt';
    return Token.find({ user: userId, expireAt: { $gte: new Date() } }, select, { sort: { createdAt: 1 } }).lean();
  } catch (error) {
    throw {
      statusCode: 400,
      code: MSG_ENUM.AUTH_LIST_TOKEN_ERROR,
      ...(error instanceof Error && { message: error.message }),
    };
  }
};

/**
 * Renew Access Token (also renew refreshToken)
 * if refreshToken is still valid, generate new accessToken AND refreshToken, and update Token collection
 */
const renew = async (user: UserDocument, oldRefreshToken: string, extra: Extra): Promise<TokensResponseSuccessful> => {
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
const revokeAll = async (userId: Types.ObjectId): Promise<void> => {
  try {
    await Token.deleteMany({ user: userId });
  } catch (error) {
    throw {
      statusCode: 400,
      code: MSG_ENUM.AUTH_REVOKE_TOKEN_ERROR,
      ...(error instanceof Error && { message: error.message }),
    };
  }
};

/**
 * Revoke Current Token
 * ( Destroy this Session )
 */
const revokeCurrent = async (userId: Types.ObjectId, refreshToken: string): Promise<void> => {
  try {
    await Token.deleteOne({ user: userId, token: refreshToken });
  } catch (error) {
    throw {
      statusCode: 400,
      code: MSG_ENUM.AUTH_REVOKE_TOKEN_ERROR,
      ...(error instanceof Error && { message: error.message }),
    };
  }
};

/**
 * Revoke All Others JWT
 * (Destroy other Sessions except current token)
 */
const revokeOthers = async (userId: Types.ObjectId, refreshToken: string): Promise<number> => {
  try {
    const { deletedCount } = await Token.deleteMany({ user: userId, token: { $ne: refreshToken } });
    return deletedCount;
  } catch (error) {
    throw {
      statusCode: 400,
      code: MSG_ENUM.AUTH_REVOKE_TOKEN_ERROR,
      ...(error instanceof Error && { message: error.message }),
    };
  }
};

/**
 * Sign Token (with optional expiresIn)
 */
const sign = async (
  payload: AuthPayload | StringPayload,
  expiresIn: number | string,
  secret = jwtSecret,
): Promise<string> =>
  new Promise<string>((resolve, reject) =>
    jwt.sign(payload, secret, { noTimestamp: true, ...(expiresIn && { expiresIn }) }, (_, token) =>
      token ? resolve(token) : reject(),
    ),
  );

/**
 * Sign String[]
 */
const signStrings = async (payload: (string | Types.ObjectId)[], expiresIn: number | string): Promise<string> =>
  sign({ data: payload.join('#') }, expiresIn);

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
 * Decode Auth Token
 */
const verifyAuth = async (token: string): Promise<Auth> => {
  const decoded = await verify<Auth>(token, true);
  if (typeof decoded === 'object' && mongoose.isObjectIdOrHexString(decoded.userId)) return decoded;
  throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };
};

/**
 * Verify & Decode Token
 */
const verifyStrings = async (token: string): Promise<string[]> => {
  const decoded = await verify<StringPayload>(token);
  if (decoded && typeof decoded === 'object' && Object.hasOwn(decoded, 'data') && typeof decoded.data === 'string')
    return decoded.data.split('#');
  // if (typeof decoded === 'string') return decoded.split('#');
  throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };
};

export default {
  createTokens,
  generate,
  list,
  renew,
  revokeAll,
  revokeCurrent,
  revokeOthers,
  sign,
  signStrings,
  verify,
  verifyStrings,
  verifyAuth,
};
