/**
 * Controller: Auth
 * common code, used by REST & Apollo
 *
 * login, logout(s)
 */

import { LOCALE, yupSchema } from '@argonne/common';
import bcrypt from 'bcryptjs';
import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import type { UpdateQuery } from 'mongoose';
import ms from 'ms';

import configLoader from '../config/config-loader';
import AuthEvent from '../models/event/auth';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { TokenDocument } from '../models/token';
import type { Id, UserDocument } from '../models/user';
import User, { userLoginSelect, userNormalSelect } from '../models/user';
import socketServer from '../socket-server';
import authenticateClient from '../utils/authenticate-client';
import { extract } from '../utils/chat';
import { idsToString, randomString } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import mail from '../utils/sendmail';
import storage from '../utils/storage';
import type { TokensResponseConflict, TokensResponseSuccessful } from '../utils/token';
import { REFRESH_TOKEN } from '../utils/token';
import token from '../utils/token';
import oAuth2Decode from './auth-oauth2';
import type { StatusResponse } from './common';
import common from './common';

type AuthResponse = { user: UserDocument & Id } & (TokensResponseConflict | TokensResponseSuccessful); // response of login or register
type AuthSuccessfulResponse = { user: UserDocument & Id } & TokensResponseSuccessful; // response of login or register

// patch actions
type Action =
  | 'addApiKey'
  | 'addPaymentMethod'
  | 'oAuth2Link'
  | 'oAuth2Unlink'
  | 'removeApiKey'
  | 'removePaymentMethod'
  | 'updateLocale'
  | 'updateNetworkStatus';

type GetAction = 'listSockets' | 'listTokens' | 'loginToken';

type PostAction =
  | 'deregister'
  | 'impersonateStart'
  | 'impersonateStop'
  | 'login'
  | 'loginWithStudentId'
  | 'loginWithToken'
  | 'logout'
  | 'logoutOthers'
  | 'oAuth2'
  | 'register'
  | 'renewToken';

const { MSG_ENUM } = LOCALE;
const { SYSTEM, USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authGetUser, hubModeOnly, guest, isAdmin, isRoot } = common;
const {
  deregisterSchema,
  idSchema,
  impersonateSchema,
  loginSchema,
  loginWithStudentIdSchema,
  loginWithTokenSchema,
  oAuth2UnlinkSchema,
  oAuth2Schema,
  optionalExpiresInSchema,
  refreshTokenSchema,
  registerSchema,
  renewTokenSchema,
  tenantIdSchema,
  userApiKeySchema,
  userIdSchema,
  userLocaleSchema,
  userNetworkStatusSchema,
  userPaymentMethodsSchema,
  userProfileSchema,
} = yupSchema;

const { DEFAULTS } = configLoader;

const LOGIN_TOKEN_PREFIX = 'LOGIN';

const JWT_COOKIE = 'jwt';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  maxAge: DEFAULTS.JWT.EXPIRES.ACCESS * 1000,
};

/**
 * (helper) login message
 */
const loginMsg = (ip: string) => ({
  enUS: `You are being logged in from IP (${ip}).`,
  zhCN: `您正在从 IP (${ip}) 登入。`,
  zhHK: `您正在從 IP (${ip}) 登錄。`,
});

/**
 * Clear expired user.suspension
 * ! note: user document might contain subset of fields
 */
const clearExpiredUserSuspension = async (user: UserDocument & Id): Promise<UserDocument & Id> =>
  user.suspension && user.suspension < new Date()
    ? (await User.findByIdAndUpdate(
        user,
        { $unset: { suspension: 1 } },
        { fields: userNormalSelect, new: true },
      ).lean())!
    : user;

/**
 * Delete User (soft deleted)
 *
 * update email to an invalid email, remove password & OAuth2
 */
const deregister = async (req: Request, res: Response, args: unknown): Promise<StatusResponse & { days: number }> => {
  hubModeOnly();
  const [user, { password, coordinates, clientHash }] = await Promise.all([
    authGetUser(req),
    deregisterSchema.validate(args),
  ]);
  const [isPasswordMatched] = await Promise.all([
    bcrypt.compare(password, user.password),
    authenticateClient(clientHash),
  ]);

  // NOT allow to deregister under impersonated, or as a tenanted-user, or user is root
  if (req.authUserId || user.tenants.length > 2 || isRoot(user.roles))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  // check if password is correct
  if (!isPasswordMatched) throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  await Promise.all([
    token.revokeAll(user._id),
    User.updateOne(user, {
      status: USER.STATUS.DELETED,
      password: `${randomString()}:::${randomString()}`,
      oAuth2: [], // clear out OAuth providers
      deletedAt: new Date(),
      emails: user.emails.map(email => `${email}@@${Date.now()}`), // make the email(s) invalid format
      tokens: [],
    }),
    User.updateMany({ _id: { $in: user.contacts.map(c => c.user) } }, { $pull: { contacts: { user: user._id } } }),
    User.updateMany({ _id: { $in: user.supervisors } }, { $pull: { staffs: user._id } }),
    AuthEvent.log(user._id, 'deregister', req.ua, req.ip, coordinates),
    notifySync('RENEW-TOKEN', { userIds: [user] }, { userIds: [user] }), // force other clients to renew (logout)
  ]);

  res.clearCookie(JWT_COOKIE);
  return { code: MSG_ENUM.COMPLETED, days: Math.floor(ms(DEFAULTS.MONGOOSE.EXPIRES.USER) / 1000 / 3600 / 24) };
};

/**
 * Impersonate as Another User
 * ! TODO: not yet tested
 * ! TODO: root could impersonate anyone
 */
const impersonateStart = async (req: Request, res: Response, args: unknown): Promise<AuthSuccessfulResponse> => {
  const { userId, authUserId } = auth(req);
  const [user, { userId: impersonatedAsId, coordinates, clientHash }] = await Promise.all([
    authGetUser(req),
    impersonateSchema.validate(args),
  ]);

  const [impersonatedUser] = await Promise.all([
    User.findOneActive({ _id: impersonatedAsId }, userNormalSelect),
    authenticateClient(clientHash),
  ]);

  // nested impersonation is NOT allowed, and only admin & parent could impersonate
  if (req.isMobile || authUserId || (!isAdmin(user.roles) && !user.staffs.includes(impersonatedAsId)))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  if (!impersonatedUser) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // NO ONE could impersonate ROOT
  let remark = isRoot(impersonatedUser.roles)
    ? `NOT allow impersonating ${impersonatedUser._id} (because of impersonated user is ROOT)`
    : !isAdmin(user.roles) && !idsToString(impersonatedUser.supervisors).includes(userId)
    ? `NOT allow impersonating ${impersonatedUser._id} (not supervisors)`
    : null;

  if (remark) {
    await AuthEvent.log(userId, 'impersonateStart', req.ua, req.ip, coordinates, remark);
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  }

  remark = `${userId} starts impersonating ${impersonatedUser._id}`;
  const tokensResponse = await token.generate(impersonatedUser, {
    authUserId: userId,
    force: true,
    ip: req.ip,
    ua: req.ua,
  });

  await Promise.all([
    AuthEvent.log(userId, 'impersonateStart', req.ua, req.ip, coordinates, remark),
    AuthEvent.log(impersonatedUser._id, 'impersonateStart', req.ua, req.ip, coordinates, remark),
    notifySync(
      'IMPERSONATION',
      { userIds: [impersonatedUser] },
      {},
      {
        msg: extract(
          {
            enUS: `You are being impersonated by ${name} (IP: ${req.ip}).`,
            zhCN: `${name} 使用你身份登入。(IP: ${req.ip}).`,
            zhHK: `${name} 使用伙身份登錄。(IP: ${req.ip}).`,
          },
          impersonatedUser.locale,
        ),
      },
    ), // notify user who is being impersonated
    notifySync('LOAD-AUTH', { userIds: [userId] }, {}), // effectively, force other tabs (in same browser) to reload tokens from localStorage
  ]);

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
  return { ...tokensResponse, user: impersonatedUser };
};

/**
 * Stop Impersonation
 * ! TODO: not yet tested
 * destroy impersonation JWT token (user should renew original refreshToken)
 */
const impersonateStop = async (req: Request, res: Response, args: unknown): Promise<StatusResponse> => {
  const { userId, authUserId } = auth(req);
  const { refreshToken, coordinates, clientHash } = await refreshTokenSchema.validate(args);
  await authenticateClient(clientHash);

  if (!authUserId) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const remark = `${authUserId} stops impersonating ${userId}`;
  await Promise.all([
    token.revokeCurrent(userId, refreshToken),
    AuthEvent.log(userId, 'impersonateStop', req.ua, req.ip, coordinates, remark),
    AuthEvent.log(authUserId, 'impersonateStop', req.ua, req.ip, coordinates, remark),
    notifySync('LOAD-AUTH', { userIds: [userId] }, {}), // effectively, force other tabs (in same browser) to reload tokens from localStorage
  ]);

  res.clearCookie(JWT_COOKIE);
  return { code: MSG_ENUM.COMPLETED };
};

/**
 * List Sockets (socket.io)
 */
const listSockets = async (req: Request): Promise<string[]> => {
  const { userId } = auth(req);
  return socketServer.listSockets(userId);
};

/**
 * List refreshTokens of user
 */
const listTokens = async (req: Request): Promise<TokenDocument[]> => {
  const { userId } = auth(req);
  return token.list(userId);
};

/**
 * Login User
 */
const login = async (req: Request, res: Response, args: unknown): Promise<AuthResponse> => {
  hubModeOnly();
  guest(req);
  const { email, password, isPublic, force, coordinates, clientHash } = await loginSchema.validate(args);

  // accept verified (lower-cased) & unverified email (upper-cased)
  const [user] = await Promise.all([
    User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }, userLoginSelect),
    authenticateClient(clientHash),
  ]);

  // check if password is correct
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  const [tokensResponse, updatedUser] = await Promise.all([
    token.generate(user, { isPublic, force, ip: req.ip, ua: req.ua }),
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'login', req.ua, req.ip, coordinates),
    notifySync('LOGIN', { userIds: [user] }, {}, { msg: extract(loginMsg(req.ip), user.locale) }),
  ]);

  updatedUser.password = '*'.repeat(password.length); // remove password information
  'accessToken' in tokensResponse
    ? res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions) // update cookie only for successful token
    : res.clearCookie(JWT_COOKIE);
  return { ...tokensResponse, user: updatedUser };
};

// const loginRestApi: RequestHandler = async (req, res, next) => {
//   // ! keep express-validator code below for reference
//   // const errors = validationResult(req);
//   // if (!errors.isEmpty()) return next({  expValidErrors: errors.array() });

//   try {
//     res.status(200).json({ data: await login(req, res, req.body) });
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * Login User (with student ID)
 * ! NOTE: ONLY support for school tenant
 */
const loginWithStudentId = async (req: Request, res: Response, args: unknown): Promise<AuthResponse> => {
  guest(req);
  const { tenantId, studentId, password, isPublic, force, coordinates, clientHash } =
    await loginWithStudentIdSchema.validate(args);

  const [user, tenant] = await Promise.all([
    User.findOneActive({ 'tenants.0': tenantId, studentIds: `${tenantId}#${studentId}` }, userLoginSelect),
    Tenant.findByTenantId(tenantId),
    authenticateClient(clientHash),
  ]);
  if (!tenant.school) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // check if password is correct
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  const [tokensResponse, updatedUser] = await Promise.all([
    token.generate(user, { isPublic, force, ip: req.ip, ua: req.ua }),
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'login', req.ua, req.ip, coordinates),
    notifySync('LOGIN', { userIds: [user] }, {}, { msg: extract(loginMsg(req.ip), user.locale) }),
  ]);

  updatedUser.password = '*'.repeat(password.length); // remove password information
  'accessToken' in tokensResponse
    ? res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions) // update cookie only for successful token
    : res.clearCookie(JWT_COOKIE);
  updatedUser.password = '*'.repeat(password.length); // remove password information
  return { ...tokensResponse, user: updatedUser };
};

/**
 * Generate one-time Login Token
 * ! only "school" tenantAdmin could generate login-token for their user
 */
const loginToken = async (req: Request, _res: Response, args: unknown): Promise<string> => {
  const { userId: tenantAdminId } = auth(req);

  const {
    tenantId,
    userId,
    expiresIn = DEFAULTS.AUTH.LOGIN_TOKEN_EXPIRES_IN,
  } = await optionalExpiresInSchema.concat(tenantIdSchema).concat(userIdSchema).validate(args);

  const [user, tenant] = await Promise.all([
    User.findOneActive({ _id: userId }),
    Tenant.findByTenantId(tenantId, tenantAdminId),
  ]);

  if (!user || !idsToString(user.tenants).includes(tenantId))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (!tenant.school) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const [loginToken] = await Promise.all([
    token.signStrings([LOGIN_TOKEN_PREFIX, userId], expiresIn),
    DatabaseEvent.log(tenantAdminId, `/users/${userId}`, 'loginToken', { user: userId, tenantAdminId }),
  ]);

  return loginToken;
};

/**
 * Login User (with login token)
 */
const loginWithToken = async (req: Request, res: Response, args: unknown): Promise<AuthResponse> => {
  guest(req);
  const { token: loginToken, coordinates, clientHash } = await loginWithTokenSchema.validate(args);
  const [[prefix, userId]] = await Promise.all([token.verifyStrings(loginToken), authenticateClient(clientHash)]);
  if (prefix !== LOGIN_TOKEN_PREFIX || !userId) throw { statusCode: 422, code: MSG_ENUM.TOKEN_ERROR };

  const user = await User.findOneActive({ _id: userId }, userNormalSelect);
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [tokensResponse, updatedUser] = await Promise.all([
    token.generate(user, { isPublic: true, force: true, ip: req.ip, ua: req.ua }),
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'loginToken', req.ua, req.ip, coordinates),
    notifySync('LOGIN', { userIds: [user] }, {}, { msg: extract(loginMsg(req.ip), user.locale) }),
  ]);

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
  return { ...tokensResponse, user: updatedUser };
};

/**
 * Logout this Session (device)
 * invalidate (remove) current JWT
 */
const logout = async (req: Request, res: Response, args: unknown): Promise<StatusResponse> => {
  const { userId } = auth(req);
  const { refreshToken, coordinates, clientHash } = await refreshTokenSchema.validate(args);
  await authenticateClient(clientHash);

  await Promise.all([
    token.revokeCurrent(userId, refreshToken),
    AuthEvent.log(userId, 'logout', req.ua, req.ip, coordinates),
    notifySync('LOAD-AUTH', { userIds: [userId] }, {}), // effectively, force other tabs (in same browser) to reload tokens from localStorage
  ]);

  res.clearCookie(JWT_COOKIE);
  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Logout this Session (device)
 * invalidate (remove) current JWT
 */
const logoutOther = async (req: Request, args: unknown): Promise<StatusResponse & { count: number }> => {
  const { userId } = auth(req);
  const { refreshToken, coordinates, clientHash } = await refreshTokenSchema.validate(args);
  await authenticateClient(clientHash);

  const [revokedCount] = await Promise.all([
    token.revokeOthers(userId, refreshToken),
    AuthEvent.log(userId, 'logoutOther', req.ua, req.ip, coordinates),
    notifySync('RENEW-TOKEN', { userIds: [userId] }, {}), // force other clients to renew (logout)
  ]);

  return { code: MSG_ENUM.COMPLETED, count: revokedCount };
};

/**
 * Register or Login with OAuth
 * note: only
 */
const oAuth2 = async (req: Request, res: Response, args: unknown): Promise<AuthResponse> => {
  hubModeOnly();
  guest(req);
  const { provider, code, isPublic, force, coordinates, clientHash } = await oAuth2Schema.validate(args);
  const [oAuthPayload] = await Promise.all([oAuth2Decode(code, provider), authenticateClient(clientHash)]);

  const oAuthId = `${provider}#${oAuthPayload.subId}`;
  const existingUser = await User.findOneActive({ oAuth2s: oAuthId }, userNormalSelect);

  // login if user exists
  if (existingUser) {
    const [tokensResponse, updatedUser] = await Promise.all([
      token.generate(existingUser, { isPublic, force, ip: req.ip, ua: req.ua }),
      clearExpiredUserSuspension(existingUser),
      AuthEvent.log(existingUser._id, 'oauth', req.ua, req.ip, coordinates, `oauth login ${oAuthId}`),
      notifySync('LOGIN', { userIds: [existingUser] }, {}, { msg: extract(loginMsg(req.ip), existingUser.locale) }),
    ]);

    'accessToken' in tokensResponse
      ? res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions) // update cookie only for successful token
      : res.clearCookie(JWT_COOKIE);
    return { ...tokensResponse, user: updatedUser };
  }

  // otherwise, try to register
  const isOAuthTaken = await User.exists({ oAuth2s: oAuthId });
  if (isOAuthTaken) throw { statusCode: 400, code: MSG_ENUM.AUTH_OAUTH_ALREADY_REGISTERED };

  // if user does not exists, create new user
  const createdUser = new User<Partial<UserDocument>>({
    name: '',
    emails: oAuthPayload.email ? [oAuthPayload.email.toLowerCase()] : [],
    oAuth2s: [`${provider}#${oAuthPayload.subId}`],
    ...(oAuthPayload.avatarUrl && { avatarUrl: await storage.fetchToLocal(oAuthPayload.avatarUrl) }),
    password: User.genValidPassword(), // generate a valid , but random password
    flags: DEFAULTS.USER.FLAGS,
    tenants: [], // non school-created users has no tenants
  });
  await createdUser.save();

  const [tokensResponse, registeredUser] = await Promise.all([
    token.generate(createdUser, { isPublic, force: true, ip: req.ip, ua: req.ua }),
    User.findOneActive({ _id: createdUser }, userNormalSelect), // read back with proper selected fields
    AuthEvent.log(createdUser._id, 'oauth', req.ua, req.ip, coordinates, `oauth register ${oAuthId}`),
  ]);

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
  return { ...tokensResponse, user: registeredUser! };
};

/**
 * Connect OAuth2
 */
const oAuth2Link = async (req: Request, args: unknown): Promise<UserDocument & Id> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { provider, code, coordinates, clientHash } = await oAuth2Schema.validate(args);

  const [user, oAuthPayload] = await Promise.all([
    authGetUser(req),
    oAuth2Decode(code, provider),
    authenticateClient(clientHash),
  ]);
  const oAuthId = `${provider}#${oAuthPayload.subId}`;
  const isOAuthTaken = await User.exists({ _id: { $ne: userId }, oAuth2s: oAuthId });

  if (!user.oAuth2s.includes(oAuthId)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // oAuth already set
  if (isOAuthTaken) throw { statusCode: 400, code: MSG_ENUM.AUTH_OAUTH_ALREADY_REGISTERED };

  // download avatar from external URL to localStorage
  const avatarUrl =
    !user.avatarUrl && oAuthPayload.avatarUrl ? await storage.fetchToLocal(oAuthPayload.avatarUrl) : null;

  const [updatedUser] = await Promise.all([
    User.findByIdAndUpdate(
      userId,
      {
        ...(oAuthPayload.email && {
          emails: Array.from(
            new Set([
              ...user.emails.map(
                email => (email.toLowerCase() === oAuthPayload.email?.toLowerCase() ? email.toLowerCase() : email), // verify email
              ),
              oAuthPayload.email.toLowerCase(),
            ]),
          ),
        }),
        ...(avatarUrl && { avatarUrl }),
        $push: { oAuth2s: oAuthId },
      },
      { fields: userNormalSelect, new: true },
    ).lean(),
    AuthEvent.log(userId, 'oauthConnect', req.ua, req.ip, coordinates, `oAuthId: ${oAuthId}`),
    notifySync(
      'RENEW-TOKEN',
      { userIds: [userId] },
      { userIds: [userId], ...(avatarUrl && { minioAddItems: [avatarUrl] }) },
    ),
  ]);
  return updatedUser!;
};

/**
 * Disconnect OAuth2
 */
const oAuth2Unlink = async (req: Request, args: unknown): Promise<UserDocument & Id> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { oAuthId, coordinates, clientHash } = await oAuth2UnlinkSchema.validate(args);
  await authenticateClient(clientHash);

  const user = await User.findOneAndUpdate(
    { _id: userId, oAuth2s: oAuthId },
    { $pull: { oAuth2s: oAuthId } },
    { fields: userNormalSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    AuthEvent.log(userId, 'oauthDisconnect', req.ua, req.ip, coordinates, `oAuthId: ${oAuthId}`),
    notifySync('RENEW-TOKEN', { userIds: [userId] }, { userIds: [userId] }),
  ]);

  return user;
};

/**
 * Register a New User
 */
const register = async (req: Request, res: Response, args: unknown): Promise<AuthSuccessfulResponse> => {
  hubModeOnly();
  guest(req);
  const { name, email, password, isPublic, coordinates, clientHash } = await registerSchema.validate(args);

  // check if email already exists
  const [existingUser] = await Promise.all([
    User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }, '_id'), // check if either lowerCase() or upperCase() email is taken
    authenticateClient(clientHash),
  ]);

  if (existingUser) throw { statusCode: 400, code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED };

  // create a new user & store into database, password encryption is achieved in model hook
  const createdUser = await User.create<Partial<UserDocument>>({
    name,
    emails: [email.toUpperCase()], // email not yet verified
    password,
    flags: DEFAULTS.USER.FLAGS,
    roles: [],
    tenants: [], // non school-created users has no tenants
  });

  const [tokensResponse, createdUserReadBack] = await Promise.all([
    token.generate(createdUser, { isPublic, force: true, ip: req.ip, ua: req.ua }),
    User.findOneActive({ _id: createdUser }, userNormalSelect), // read back with proper selected fields
    mail.confirmEmail(name, createdUser.locale, email), // send registration confirmation email
    AuthEvent.log(createdUser._id, 'register', req.ua, req.ip, coordinates),
  ]);

  if (!createdUserReadBack) {
    log('error', `questionController:register()`, { id: createdUser._id.toString() });
    throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
  }

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
  return { ...tokensResponse, user: createdUserReadBack };
};

// const registerRestApi: RequestHandler = async (req, res, next) => {
//   // ! keep express-validator code below for reference
//   // const errors = validationResult(req);
//   // if (!errors.isEmpty()) return next({ expValidErrors: errors.array() });

//   try {
//     res.status(201).json({ data: await register(req, res, req.body) });
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * Renew Tokens (access & refresh)
 * generate (access & refresh) tokens & updated userProfile (note: accessToken is not needed, possibly expired)
 */
const renewToken = async (req: Request, res: Response, args: unknown): Promise<AuthSuccessfulResponse> => {
  const { refreshToken, isPublic, coordinates, clientHash } = await renewTokenSchema.validate(args);

  const [[prefix, userId]] = await Promise.all([token.verifyStrings(refreshToken), authenticateClient(clientHash)]);
  if (prefix !== REFRESH_TOKEN || !userId) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const user = await User.findOneActive({ _id: userId }, userNormalSelect);
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tokensResponse = await token.renew(user, refreshToken, { isPublic, ip: req.ip, ua: req.ua });

  const remark = `oldToken: ${refreshToken}, newToken: ${tokensResponse.refreshToken}`;
  const [updatedUser] = await Promise.all([
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'renew', req.ua, req.ip, coordinates, remark),
    notifySync('LOAD-AUTH', { userIds: [userId] }, {}), // effectively, force other tabs (in same browser) to reload tokens from localStorage
  ]);

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions);

  return { ...tokensResponse, user: updatedUser };
};

const update = async (req: Request, args: unknown, action?: Action): Promise<UserDocument & Id> => {
  const { userId } = auth(req);

  const updateAndNotify = async (updateQuery: UpdateQuery<UserDocument>, event: Record<string, unknown>) => {
    const [updatedUser] = await Promise.all([
      User.findByIdAndUpdate(userId, updateQuery, { fields: userNormalSelect, new: true }).lean(),
      DatabaseEvent.log(userId, `/users/${userId}`, action || 'update', event),
      notifySync('RENEW-TOKEN', { userIds: [userId] }, { userIds: [userId] }), // renew-token to reload updated user
    ]);
    if (updatedUser) return updatedUser;
    log('error', `authController:${action}()`, { userId, action }, userId);
    throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
  };

  if (action === 'addApiKey') {
    const fields = await userApiKeySchema.validate(args);
    return updateAndNotify({ $push: { value: randomString(), ...fields } }, { ...fields });
  } else if (action === 'addPaymentMethod') {
    const fields = await userPaymentMethodsSchema.validate(args);
    return updateAndNotify({ $push: { paymentMethods: fields } }, fields);
  } else if (action === 'removeApiKey') {
    const { id } = await idSchema.validate(args);
    return updateAndNotify({ $pull: { apiKeys: { _id: id } } }, { id });
  } else if (action === 'removePaymentMethod') {
    const [original, { id }] = await Promise.all([authGetUser(req), idSchema.validate(args)]);

    const originalPaymentMethod = original.paymentMethods.find(p => p._id?.toString() === id);
    if (!originalPaymentMethod) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    return updateAndNotify({ $pull: { paymentMethods: { _id: id } } }, { originalPaymentMethod });
  } else if (action === 'updateLocale') {
    const [user, { locale }] = await Promise.all([authGetUser(req), userLocaleSchema.validate(args)]);
    if (!Object.keys(SYSTEM.LOCALE).includes(locale)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // re-verify locale value (YUP has verified already)
    return updateAndNotify({ locale }, { original: user.locale, new: locale });
  } else if (action === 'updateNetworkStatus') {
    const { networkStatus } = await userNetworkStatusSchema.validate(args);
    if (!Object.keys(USER.NETWORK_STATUS).includes(networkStatus) || networkStatus === USER.NETWORK_STATUS.OFFLINE)
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // make no sense to set OFFLINE (auto-detected by socket-server)

    return networkStatus === USER.NETWORK_STATUS.ONLINE
      ? updateAndNotify({ $unset: { networkStatus: 1 } }, { networkStatus })
      : updateAndNotify({ networkStatus }, { networkStatus });
  } else {
    const [user, { avatarUrl, ...fields }] = await Promise.all([authGetUser(req), userProfileSchema.validate(args)]);

    if (user.avatarUrl !== avatarUrl)
      await Promise.all([
        avatarUrl && storage.validateObject(avatarUrl, userId, avatarUrl.startsWith('avatarUrl-')), // only need to validate NEW avatarUrl, skip ownership check for built-in avatar
        user.avatarUrl && !user.avatarUrl.startsWith('avatarUrl-') && storage.removeObject(user.avatarUrl), // remove old avatarUrl from minio if exists and is different from new avatarUrl (& non built-in avatar)
      ]);

    return updateAndNotify(
      { ...fields, ...(avatarUrl ? { avatarUrl } : { $unset: { avatarUrl: 1 } }) },
      { original: user, update: { avatarUrl, ...fields } },
    );
  }
};

/**
 * Update by ID (RESTful)
 */
const updateById: RequestHandler<{ action?: Action }> = async (req, res, next) => {
  const { action } = req.params;
  try {
    switch (action) {
      case 'oAuth2Link':
        return res.status(200).json(await oAuth2Link(req, req.body));
      case 'oAuth2Unlink':
        return res.status(200).json(await oAuth2Unlink(req, req.body));
      default:
        return res.status(200).json({ data: await update(req, req.body, action) });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get Action (RESTful)
 */
const getAction: RequestHandler<{ action: GetAction }> = async (req, res, next) => {
  const { action } = req.params;
  try {
    switch (action) {
      case 'listSockets':
        return res.status(200).json({ data: await listSockets(req) });
      case 'listTokens':
        return res.status(200).json({ data: await listTokens(req) });
      case 'loginToken':
        return res.status(200).json({ data: await loginToken(req, res, req.body) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Post Action (RESTful)
 */
const postAction: RequestHandler<{ action: PostAction }> = async (req, res, next) => {
  const { action } = req.params;
  try {
    switch (action) {
      case 'deregister':
        return res.status(200).json(await deregister(req, res, req.body));
      case 'impersonateStart':
        return res.status(200).json({ data: await impersonateStart(req, res, req.body) });
      case 'impersonateStop':
        return res.status(200).json({ data: await impersonateStop(req, res, req.body) });
      case 'login':
        return res.status(200).json({ data: await login(req, res, req.body) });
      case 'loginWithStudentId':
        return res.status(200).json({ data: await loginWithStudentId(req, res, req.body) });
      case 'loginWithToken':
        return res.status(200).json({ data: await loginWithToken(req, res, req.body) });
      case 'logout':
        return res.status(200).json(await logout(req, res, req.body));
      case 'logoutOthers':
        return res.status(200).json(await logoutOther(req, req.body));
      case 'oAuth2':
        return res.status(200).json({ data: await oAuth2(req, res, req.body) });
      case 'register':
        return res.status(201).json({ data: await register(req, res, req.body) });
      case 'renewToken':
        return res.status(200).json({ data: await renewToken(req, res, req.body) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  getAction,
  deregister,
  impersonateStart,
  impersonateStop,
  listSockets,
  listTokens,
  login,
  loginToken,
  loginWithStudentId,
  loginWithToken,
  logout,
  logoutOther,
  oAuth2,
  oAuth2Link,
  oAuth2Unlink,
  postAction,
  register,
  renewToken,
  update,
  updateById,
};
