/**
 * Controller: Auth
 * common code, used by REST & Apollo
 *
 * login, logout(s)
 */

import { LOCALE, yupSchema } from '@argonne/common';
import bcrypt from 'bcryptjs';
import { CookieOptions, Request, RequestHandler, Response } from 'express';
import type { LeanDocument } from 'mongoose';
import ms from 'ms';

import configLoader from '../config/config-loader';
import AuthEvent from '../models/event/auth';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { TokenDocument } from '../models/token';
import type { UserDocument } from '../models/user';
import User, { userLoginSelect, userNormalSelect } from '../models/user';
import socketServer from '../socket-server';
import authenticateClient from '../utils/authenticate-client';
import { extract } from '../utils/chat';
import { idsToString, randomString } from '../utils/helper';
import { notify } from '../utils/messaging';
import mail from '../utils/sendmail';
import storage from '../utils/storage';
import syncSatellite from '../utils/sync-satellite';
import type { TokensResponseConflict, TokensResponseSuccessful } from '../utils/token';
import token from '../utils/token';
import type { OAuthPayload } from './auth-oauth2';
import oAuth2Decode from './auth-oauth2';
import type { StatusResponse } from './common';
import common from './common';

type AuthResponse = { user: LeanDocument<UserDocument> } & (TokensResponseConflict | TokensResponseSuccessful); // response of login or register
type AuthSuccessfulResponse = { user: LeanDocument<UserDocument> } & TokensResponseSuccessful; // response of login or register

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
  | 'oAuth2Connect'
  | 'oAuth2Disconnect'
  | 'register'
  | 'renewToken';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authGetUser, hubModeOnly, guest, isAdmin, isRoot } = common;
const {
  deregisterSchema,
  impersonateSchema,
  loginSchema,
  loginWithStudentIdSchema,
  oAuth2DisconnectSchema,
  oAuth2Schema,
  optionalExpiresInSchema,
  refreshTokenSchema,
  registerSchema,
  renewTokenSchema,
  tenantIdSchema,
  tokenSchema,
  userIdSchema,
} = yupSchema;

const { DEFAULTS } = configLoader;

const JWT_COOKIE = 'jwt';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  maxAge: DEFAULTS.JWT.EXPIRES.ACCESS * 1000,
};

/**
 * Clear expired user.suspension
 * ! note: user document might contain subset of fields
 */
const clearExpiredUserSuspension = async (user: LeanDocument<UserDocument>): Promise<LeanDocument<UserDocument>> =>
  user.suspension && user.suspension < new Date()
    ? User.findByIdAndUpdate(user, { $unset: { suspension: 1 } }, { fields: userNormalSelect, new: true }).lean()
    : user;

/**
 * Delete User (soft deleted)
 *
 * update email to an invalid email, remove password & OAuth2
 */
const deregister = async (req: Request, res: Response, args: unknown): Promise<StatusResponse & { days: number }> => {
  hubModeOnly();
  const user = await authGetUser(req);
  const { password, coordinates, clientHash } = await deregisterSchema.validate(args);
  await authenticateClient(clientHash);

  // NOT allow to deregister under impersonated, or as a tenanted-user, or user is root
  if (req.authUserId || user.tenants.length > 2 || isRoot(user.roles))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  // check if password is correct
  if (!(await bcrypt.compare(password, user.password)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  await Promise.all([
    token.revokeAll(user._id),
    User.findByIdAndUpdate(user, {
      status: USER.STATUS.DELETED,
      password: `${randomString()}:::${randomString()}`,
      oAuth2: [], // clear out OAuth providers
      deletedAt: new Date(),
      emails: user.emails.map(email => `${email}@@${Date.now()}`), // make the email(s) invalid format
      tokens: [],
    }).lean(),
    User.updateMany({ _id: { $in: user.contacts.map(c => c.user) } }, { $pull: { contacts: { user: user._id } } }),
    User.updateMany({ _id: { $in: user.supervisors } }, { $pull: { staffs: user._id } }),
    AuthEvent.log(user._id, 'deregister', req.ua, req.ip, coordinates),
  ]);

  res.clearCookie(JWT_COOKIE);
  return { code: MSG_ENUM.COMPLETED, days: Math.floor(ms(DEFAULTS.MONGOOSE.EXPIRES.USER) / 1000 / 3600 / 24) };
};

/**
 * Impersonate as Another User
 * ! TODO: not yet tested
 * ! TODO: root could impersonate anyone
 */
const impersonateStart = async (req: Request, args: unknown): Promise<AuthSuccessfulResponse> => {
  const { userId, authUserId } = auth(req);
  const user = await authGetUser(req);
  const { impersonatedAsId, coordinates, clientHash } = await impersonateSchema.validate(args);
  await authenticateClient(clientHash);

  // nested impersonation is NOT allowed, and only admin & parent could impersonate
  if (req.isMobile || authUserId || (!isAdmin(user.roles) && !user.staffs.includes(impersonatedAsId)))
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const impersonatedUser = await User.findOneActive({ _id: impersonatedAsId }, userNormalSelect);
  if (!impersonatedUser) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // NO ONE could impersonate ROOT
  if (isRoot(impersonatedUser.roles)) {
    const remark = `NOT allow impersonating ${impersonatedUser._id} (because of ROOT)`;
    await AuthEvent.log(userId, 'impersonateStart', req.ua, req.ip, coordinates, remark);
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  }
  const remark = `${userId} starts impersonating ${impersonatedUser._id}`;
  const tokensResponse = await token.generate(impersonatedUser, {
    authUserId: userId,
    force: true,
    ip: req.ip,
    ua: req.ua,
  });

  const msg = {
    enUS: `You are being impersonated by ${user.name} (IP: ${req.ip}).`,
    zhCN: `${user.name} 使用你身份登入。(IP: ${req.ip}).`,
    zhHK: `${user.name} 使用伙身份登錄。(IP: ${req.ip}).`,
  };
  await Promise.all([
    AuthEvent.log(userId, 'impersonateStart', req.ua, req.ip, coordinates, remark),
    AuthEvent.log(impersonatedUser._id, 'impersonateStart', req.ua, req.ip, coordinates, remark),
    notify([impersonatedUser._id], 'IMPERSONATION', { msg: extract(msg, impersonatedUser.locale) }),
  ]);

  return { ...tokensResponse, user: impersonatedUser };
};

/**
 * Stop Impersonation
 * ! TODO: not yet tested
 * destroy impersonation JWT token
 */
const impersonateStop = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, authUserId } = auth(req);
  const { refreshToken, coordinates } = await refreshTokenSchema.validate(args);

  if (!authUserId) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const remark = `${authUserId} stops impersonating ${userId}`;
  await Promise.all([
    token.revokeCurrent(userId, refreshToken),
    AuthEvent.log(userId, 'impersonateStop', req.ua, req.ip, coordinates, remark),
    AuthEvent.log(authUserId, 'impersonateStop', req.ua, req.ip, coordinates, remark),
  ]);

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
  await authenticateClient(clientHash);

  // accept verified (lower-cased) & unverified email (upper-cased)
  const user = await User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }, userLoginSelect);

  // check if password is correct
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  const msg = {
    enUS: `You are being logged in from IP (${req.ip}).`,
    zhCN: `您正在从 IP (${req.ip}) 登入。`,
    zhHK: `您正在從 IP (${req.ip}) 登錄。`,
  };
  const [tokensResponse, updatedUser] = await Promise.all([
    token.generate(user, { isPublic, force, ip: req.ip, ua: req.ua }),
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'login', req.ua, req.ip, coordinates),
    notify([user._id], 'LOGIN', { msg: extract(msg, user.locale) }),
  ]);

  updatedUser.password = '*'.repeat(password.length); // remove password information
  if ('accessToken' in tokensResponse) res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
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
  const { studentId, password, isPublic, force, coordinates, clientHash, tenantId } =
    await loginWithStudentIdSchema.validate(args);

  const [tenant] = await Promise.all([Tenant.findByTenantId(tenantId), authenticateClient(clientHash)]);
  if (!tenant.school) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const user = await User.findOneActive(
    { tenants: tenantId, studentIds: `${tenantId}#${studentId}`, school: tenant.school },
    userLoginSelect,
  );

  // check if password is correct
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  const msg = {
    enUS: `You are being logged in from IP (${req.ip}).`,
    zhCN: `您正在从 IP (${req.ip}) 登入。`,
    zhHK: `您正在從 IP (${req.ip}) 登錄。`,
  };
  const [tokensResponse, updatedUser] = await Promise.all([
    token.generate(user, { isPublic, force, ip: req.ip, ua: req.ua }),
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'login', req.ua, req.ip, coordinates),
    notify([user._id], 'LOGIN', { msg: extract(msg, user.locale) }),
  ]);

  if ('accessToken' in tokensResponse) res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
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
    token.signEvent(userId, 'login', expiresIn),
    DatabaseEvent.log(tenantAdminId, `/users/${userId}`, 'loginToken', { user: userId }),
  ]);

  return loginToken;
};

/**
 * Login User (with login token)
 */
const loginWithToken = async (req: Request, res: Response, args: unknown): Promise<AuthResponse> => {
  guest(req);
  const { token: loginToken } = await tokenSchema.validate(args);
  const { id: userId } = await token.verifyEvent(loginToken, 'login');

  const user = await User.findOneActive({ _id: userId }, userNormalSelect);
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [tokensResponse, updatedUser] = await Promise.all([
    token.generate(user, { isPublic: true, force: true, ip: req.ip, ua: req.ua }),
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'loginToken', req.ua, req.ip, null),
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
  const { refreshToken, coordinates } = await refreshTokenSchema.validate(args);

  await Promise.all([
    token.revokeCurrent(userId, refreshToken),
    AuthEvent.log(userId, 'logout', req.ua, req.ip, coordinates),
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
  const { refreshToken, coordinates } = await refreshTokenSchema.validate(args);

  const [revokedCount] = await Promise.all([
    token.revokeOthers(userId, refreshToken),
    AuthEvent.log(userId, 'logoutOther', req.ua, req.ip, coordinates),
  ]);

  return { code: MSG_ENUM.COMPLETED, count: revokedCount };
};

/**
 * Register or Login with OAuth
 */
const oAuth2 = async (req: Request, args: unknown): Promise<AuthResponse> => {
  hubModeOnly();
  guest(req);
  const { provider, code, isPublic, force, coordinates, clientHash } = await oAuth2Schema.validate(args);
  await authenticateClient(clientHash);

  let oAuthPayload: OAuthPayload;
  switch (provider) {
    case USER.OAUTH2.PROVIDER.FACEBOOK:
    case USER.OAUTH2.PROVIDER.GITHUB:
      throw { statusCode: 999, code: MSG_ENUM.WIP };
    case USER.OAUTH2.PROVIDER.GOOGLE:
      oAuthPayload = await oAuth2Decode.google(code);
      break;
    default:
      throw { statusCode: 401, code: MSG_ENUM.OAUTH2_UNSUPPORTED_PROVIDER };
  }

  // for register or login

  const oAuthId = `${provider}#${oAuthPayload.subId}`;
  const existingUser = await User.findOneActive({ oAuth2s: oAuthId }, userNormalSelect);

  // login if user exists
  if (existingUser) {
    const msg = {
      enUS: `You are being logged in from IP (${req.ip}).`,
      zhCN: `您正在从 IP (${req.ip}) 登入。`,
      zhHK: `您正在從 IP (${req.ip}) 登錄。`,
    };
    const [tokensResponse, updatedUser] = await Promise.all([
      token.generate(existingUser, { isPublic, force, ip: req.ip, ua: req.ua }),
      clearExpiredUserSuspension(existingUser),
      AuthEvent.log(existingUser._id, 'oauth', req.ua, req.ip, coordinates, `oauth login ${oAuthId}`),
      syncSatellite({ userIds: [existingUser._id.toString()] }, { userIds: [existingUser._id.toString()] }),
      notify([existingUser._id], 'LOGIN', { msg: extract(msg, existingUser.locale) }),
    ]);
    return { ...tokensResponse, user: updatedUser };
  }

  // otherwise, try to register
  hubModeOnly();
  const [defaultTenant, oAuthTaken] = await Promise.all([Tenant.findDefault(), User.exists({ oAuth2s: oAuthId })]);
  if (oAuthTaken) throw { statusCode: 400, code: MSG_ENUM.AUTH_OAUTH_ALREADY_REGISTERED };

  // if user does not exists, create new user
  const createdUser = new User<Partial<UserDocument>>({
    name: '',
    emails: oAuthPayload.email ? [oAuthPayload.email.toLowerCase()] : [],
    oAuth2s: [`${provider}#${oAuthPayload.subId}`],
    ...(oAuthPayload.avatarUrl && { avatarUrl: await storage.fetchToLocal(oAuthPayload.avatarUrl) }),
    password: User.genValidPassword(), // generate a valid , but random password
    flags: DEFAULTS.USER.FLAGS,
    tenants: [defaultTenant._id],
  });
  await createdUser.save();

  const [tokensResponse, registeredUser] = await Promise.all([
    token.generate(createdUser, { isPublic, force, ip: req.ip, ua: req.ua }),
    User.findOneActive({ _id: createdUser }, userNormalSelect), // read back with proper selected fields
    AuthEvent.log(createdUser._id, 'oauth', req.ua, req.ip, coordinates, `oauth register ${oAuthId}`),
    syncSatellite({ userIds: [createdUser._id.toString()] }, { userIds: [createdUser._id.toString()] }),
  ]);

  return { ...tokensResponse, user: registeredUser! };
};

/**
 * Connect OAuth2
 */
const oAuth2Connect = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  hubModeOnly();
  const { provider, code, coordinates } = await oAuth2Schema.validate(args);

  let oAuthPayload: OAuthPayload;
  switch (provider) {
    case USER.OAUTH2.PROVIDER.FACEBOOK:
    case USER.OAUTH2.PROVIDER.GITHUB:
      throw { statusCode: 999, code: MSG_ENUM.WIP };
    case USER.OAUTH2.PROVIDER.GOOGLE:
      oAuthPayload = await oAuth2Decode.google(code);
      break;
    default:
      throw { statusCode: 401, code: MSG_ENUM.OAUTH2_UNSUPPORTED_PROVIDER };
  }

  // update user document
  const oAuthId = `${provider}#${oAuthPayload.subId}`;
  const { userId } = auth(req);
  const [user, oAuthTaken] = await Promise.all([
    User.findOneActive({ _id: userId, oAuth2s: { $ne: oAuthId } }),
    User.exists({ _id: { $ne: userId }, oAuth2s: oAuthId }),
  ]);

  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // oAuth already set
  if (oAuthTaken) throw { statusCode: 400, code: MSG_ENUM.AUTH_OAUTH_ALREADY_REGISTERED };

  // also try to verify emails
  const updatedEmails = !!oAuthPayload.email && {
    emails: Array.from(
      new Set([
        ...user.emails.map(email =>
          email.toLowerCase() === oAuthPayload.email?.toLowerCase() ? email.toLowerCase() : email,
        ),
        oAuthPayload.email.toLowerCase(),
      ]),
    ),
  };

  // download avatar from extenal URL to localStorage
  const updateAvatarUrl = !user.avatarUrl &&
    !!oAuthPayload.avatarUrl && { avatarUrl: await storage.fetchToLocal(oAuthPayload.avatarUrl) };

  const [updatedUser] = await Promise.all([
    User.findByIdAndUpdate(
      user,
      { ...updatedEmails, ...updateAvatarUrl, $push: { oAuth2s: oAuthId } },
      { fields: userNormalSelect, new: true },
    ).lean(),
    AuthEvent.log(user._id, 'oauthConnect', req.ua, req.ip, coordinates, `oAuthId: ${oAuthId}`),
  ]);
  return updatedUser!;
};

/**
 * Disconnect OAuth2
 */
const oAuth2Disconnect = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { oAuthId, coordinates } = await oAuth2DisconnectSchema.validate(args);

  const user = await User.findOneAndUpdate(
    { _id: userId, oAuth2s: oAuthId },
    { $pull: { oAuth2s: oAuthId } },
    { fields: userNormalSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await AuthEvent.log(userId, 'oauthDisconnect', req.ua, req.ip, coordinates, `oAuthId: ${oAuthId}`);

  return user;
};

/**
 * Register a New User
 */
const register = async (req: Request, res: Response, args: unknown): Promise<AuthSuccessfulResponse> => {
  hubModeOnly();
  guest(req);
  const { name, email, password, isPublic, coordinates, clientHash } = await registerSchema.validate(args);
  await authenticateClient(clientHash);

  // check if email already exists
  const [existingUser, defaultTenant] = await Promise.all([
    User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }, '_id'), // check if either lowerCase() or upperCase() email is taken
    Tenant.findDefault(),
  ]);
  if (existingUser) throw { statusCode: 400, code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED };

  // create a new user & store into database, password encryption is achieved in model hook
  const createdUser = await User.create<Partial<UserDocument>>({
    name,
    emails: [email.toUpperCase()], // email not yet verified
    password,
    flags: DEFAULTS.USER.FLAGS,
    roles: [],
    tenants: [defaultTenant._id],
  });

  const [tokensResponse, createdUserReadBack] = await Promise.all([
    token.generate(createdUser, { isPublic, force: true, ip: req.ip, ua: req.ua }),
    User.findOneActive({ _id: createdUser }, userNormalSelect), // read back with proper selected fields
    mail.confirmEmail(createdUser, email), // send registration confirmation email
    AuthEvent.log(createdUser._id, 'register', req.ua, req.ip, coordinates),
  ]);

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
  return { ...tokensResponse, user: createdUserReadBack! };
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
 * generate a new access token (& and possibly reload updated user profile)
 */
const renewToken = async (req: Request, res: Response, args: unknown): Promise<AuthSuccessfulResponse> => {
  const { refreshToken, isPublic, coordinates, clientHash } = await renewTokenSchema.validate(args);
  await authenticateClient(clientHash);
  const { userId } = await token.verify<{ userId?: string }>(refreshToken);

  const user = await User.findOneActive({ _id: userId }, userNormalSelect);
  if (!userId || !user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tokensResponse = await token.renew(user, refreshToken, { isPublic, ip: req.ip, ua: req.ua });

  const remark = `oldToken: ${refreshToken}, newToken: ${tokensResponse.refreshToken}`;
  const [updatedUser] = await Promise.all([
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'renew', req.ua, req.ip, coordinates, remark),
  ]);

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions);

  return { ...tokensResponse, user: updatedUser };
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
        return res.status(200).json({ data: await impersonateStart(req, req.body) });
      case 'impersonateStop':
        return res.status(200).json({ data: await impersonateStop(req, req.body) });
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
        return res.status(200).json({ data: await oAuth2(req, req.body) });
      case 'oAuth2Connect':
        return res.status(200).json(await oAuth2Connect(req, req.body));
      case 'oAuth2Disconnect':
        return res.status(200).json(await oAuth2Disconnect(req, req.body));
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
  oAuth2Connect,
  oAuth2Disconnect,
  postAction,
  register,
  renewToken,
};
