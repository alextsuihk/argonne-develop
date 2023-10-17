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
import Tutor from '../models/tutor';
import type { UserDocument } from '../models/user';
import User, { activeCond, userLoginSelect, userNormalSelect } from '../models/user';
import socketServer from '../socket-server';
import authenticateClient from '../utils/authenticate-client';
import { extract } from '../utils/chat';
import { mongoId, randomString } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import mail from '../utils/sendmail';
import storage from '../utils/storage';
import type { TokensResponseConflict, TokensResponseSuccessful } from '../utils/token';
import token, { REFRESH_TOKEN_PREFIX } from '../utils/token';
import type { GetExtraAction, PostExtraAction } from './auth-extra';
import {
  addApiKey,
  isEmailAvailable,
  listApiKeys,
  removeApiKey,
  sendEmailVerification,
  sendMessengerVerification,
  update,
  updateHandler,
  verifyEmail,
} from './auth-extra';
import oAuth2Decode from './auth-oauth2';
import type { GetAuthServiceAction } from './auth-service';
import { authServiceToken, authServiceUserInfo } from './auth-service';
import type { StatusResponse } from './common';
import common from './common';

type AuthResponse = { user: UserDocument } & (TokensResponseConflict | TokensResponseSuccessful); // response of login or register
type AuthSuccessfulResponse = { user: UserDocument } & TokensResponseSuccessful; // response of login or register

type GetAction = GetAuthServiceAction | GetExtraAction | 'listSockets' | 'listTokens' | 'loginToken';

type PostAction =
  | PostExtraAction
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
const { USER } = LOCALE.DB_ENUM;
const { assertUnreachable, auth, authGetUser, hubModeOnly, guest, isAdmin, isRoot } = common;
const {
  loginCommon,
  deregisterSchema,
  impersonateSchema,
  loginSchema,
  loginWithStudentIdSchema,
  loginWithTokenSchema,
  oAuth2Schema,
  optionalExpiresInSchema,
  refreshTokenSchema,
  registerSchema,
  renewTokenSchema,
  tenantIdSchema,
  userIdSchema,
} = yupSchema;

// const { verifyMessenger } = authProfileController;

const { DEFAULTS } = configLoader;

const LOGIN_TOKEN_PREFIX = 'AUTH-LOGIN';

const JWT_COOKIE = 'jwt';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  maxAge: DEFAULTS.JWT.EXPIRES.ACCESS * 1000,
};

/**
 * (helper) login message
 */
const loginMsg = (locale: string, ip: string) =>
  extract(
    {
      enUS: `You are being logged in from IP (${ip}).`,
      zhCN: `您正在从 IP (${ip}) 登入。`,
      zhHK: `您正在從 IP (${ip}) 登錄。`,
    },
    locale,
  );

/**
 * Clear expired user.suspendUtil
 * ! note: user document might contain subset of fields
 */
const clearExpiredUserSuspension = async (user: UserDocument): Promise<UserDocument> =>
  user.suspendUtil && user.suspendUtil < new Date()
    ? (await User.findByIdAndUpdate(
        user,
        { $unset: { suspendUtil: 1 } },
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

  const update: UpdateQuery<UserDocument> = {
    status: USER.STATUS.DELETED,
    password: `${randomString()}:::${randomString()}`,
    oAuth2s: [], // clear out OAuth providers
    deletedAt: new Date(),
    emails: user.emails.map(email => `${email}@@${Date.now()}`), // make the email(s) invalid format
    messengers: [],
  };

  const { oAuth2s, emails, messengers } = user;
  const contactIds = user.contacts.map(c => c.user);
  const removeContactsUpdate: UpdateQuery<UserDocument> = { $pull: { contacts: { user: user._id } } };
  const removeStaffUpdate: UpdateQuery<UserDocument> = { $pull: { staffs: user._id } };
  await Promise.all([
    token.revokeAll(user._id),
    User.updateOne(user, update),
    User.updateMany({ _id: { $in: contactIds } }, removeContactsUpdate),
    User.updateMany({ _id: { $in: user.supervisors } }, removeStaffUpdate),
    Tutor.updateOne({ user: user._id }, { deletedAt: new Date() }),
    DatabaseEvent.log(user._id, '/auth', 'deregister', { oAuth2s, emails, messengers }),
    AuthEvent.log(user._id, 'deregister', req.ua, req.ip, coordinates),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-RENEW-TOKEN' }, // force other clients to renew (logout)
      {
        bulkWrite: {
          users: [
            { updateOne: { filter: { _id: user._id }, update } },
            { updateMany: { filter: { _id: { $in: contactIds } }, update: removeContactsUpdate } },
            { updateMany: { filter: { _id: { $in: user.supervisors } }, update: removeStaffUpdate } },
          ] satisfies BulkWrite<UserDocument>,
        },
        extra: { revokeAllTokensByUserId: user._id },
      },
    ),
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
  const { userId, userName, authUserId } = auth(req);
  const [user, { userId: impersonatedAsId, coordinates, clientHash }] = await Promise.all([
    authGetUser(req),
    impersonateSchema.validate(args),
  ]);

  const [impersonatedUser] = await Promise.all([
    User.findOne({ _id: impersonatedAsId, ...activeCond }, userNormalSelect).lean(),
    authenticateClient(clientHash),
  ]);

  // nested impersonation is NOT allowed, and only admin & parent could impersonate
  if (
    req.isMobile ||
    authUserId ||
    (!isAdmin(user.roles) && !user.staffs.some(staff => staff.equals(impersonatedAsId)))
  )
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  if (!impersonatedUser) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // NO ONE could impersonate ROOT
  let remark = isRoot(impersonatedUser.roles)
    ? `NOT allow impersonating ${impersonatedUser._id} (because of impersonated user is ROOT)`
    : !isAdmin(user.roles) && !impersonatedUser.supervisors.some(s => s.equals(userId))
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

  const msg = extract(
    {
      enUS: `You are being impersonated by ${userName} (IP: ${req.ip}).`,
      zhCN: `${userName} 使用你身份登入。(IP: ${req.ip}).`,
      zhHK: `${userName} 使用伙身份登錄。(IP: ${req.ip}).`,
    },
    impersonatedUser.locale,
  );
  await Promise.all([
    AuthEvent.log(userId, 'impersonateStart', req.ua, req.ip, coordinates, remark),
    AuthEvent.log(impersonatedUser._id, 'impersonateStart', req.ua, req.ip, coordinates, remark),
    notifySync(
      impersonatedUser.tenants[0] || null,
      { userIds: [impersonatedUser._id], event: 'IMPERSONATION', msg },
      null,
    ), // notify user who is being impersonated

    notifySync(null, { userIds: [userId], event: 'AUTH-RELOAD' }, null), // effectively, force other tabs (in same browser) to reload tokens from localStorage
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
  const { refreshToken, coordinates } = await refreshTokenSchema.validate(args);

  if (!authUserId) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const remark = `${authUserId} stops impersonating ${userId}`;
  await Promise.all([
    token.revokeCurrent(userId, refreshToken),
    AuthEvent.log(userId, 'impersonateStop', req.ua, req.ip, coordinates, remark),
    AuthEvent.log(authUserId, 'impersonateStop', req.ua, req.ip, coordinates, remark),
    notifySync(null, { userIds: [userId], event: 'AUTH-RELOAD' }, null), // effectively, force other tabs (in same browser) to reload tokens from localStorage
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
    User.findOne({ emails: { $in: [email, email.toUpperCase()] }, ...activeCond }, userLoginSelect).lean(),
    authenticateClient(clientHash),
  ]);

  // check if password is correct
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw { statusCode: 401, code: MSG_ENUM.AUTH_CREDENTIALS_ERROR };

  const [tokensResponse, updatedUser] = await Promise.all([
    token.generate(user, { isPublic, force, ip: req.ip, ua: req.ua }),
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'login', req.ua, req.ip, coordinates),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-LOGIN', msg: loginMsg(user.locale, req.ip) },
      null,
    ),
  ]);

  updatedUser.password = '*'.repeat(password.length); // remove password information
  'accessToken' in tokensResponse
    ? res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions) // update cookie only for successful token
    : res.clearCookie(JWT_COOKIE);
  return { ...tokensResponse, user: updatedUser };
};

/**
 * Login User (with student ID)
 * ! NOTE: ONLY support for school tenant
 */
const loginWithStudentId = async (req: Request, res: Response, args: unknown): Promise<AuthResponse> => {
  guest(req);
  const { tenantId, studentId, password, isPublic, force, coordinates, clientHash } =
    await loginWithStudentIdSchema.validate(args);

  const [user, tenant] = await Promise.all([
    User.findOne(
      { 'tenants.0': tenantId, studentIds: `${tenantId}#${studentId}`, ...activeCond },
      userLoginSelect,
    ).lean(),
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
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-LOGIN', msg: loginMsg(user.locale, req.ip) },
      null,
    ),
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
const loginToken = async (req: Request, args: unknown): Promise<string> => {
  const { userId: tenantAdminId } = auth(req);

  const {
    tenantId,
    userId,
    expiresIn = DEFAULTS.AUTH.LOGIN_TOKEN_EXPIRES_IN,
  } = await optionalExpiresInSchema.concat(tenantIdSchema).concat(userIdSchema).validate(args);

  const [user, tenant] = await Promise.all([
    User.findOne({ _id: userId, tenants: tenantId, ...activeCond }).lean(),
    Tenant.findByTenantId(tenantId, tenantAdminId),
  ]);

  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (!tenant.school) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const [loginToken] = await Promise.all([
    token.signStrings([LOGIN_TOKEN_PREFIX, userId], expiresIn),
    DatabaseEvent.log(tenantAdminId, `/users/${userId}`, 'loginToken', { userId, tenantAdminId }),
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

  const user = await User.findOne({ _id: userId, ...activeCond }, userNormalSelect).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [tokensResponse, updatedUser] = await Promise.all([
    token.generate(user, { isPublic: true, force: true, ip: req.ip, ua: req.ua }),
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'loginToken', req.ua, req.ip, coordinates),
    notifySync(
      user.tenants[0] || null,
      { userIds: [user._id], event: 'AUTH-LOGIN', msg: loginMsg(user.locale, req.ip) },
      null,
    ),
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
    notifySync(null, { userIds: [userId], event: 'AUTH-RELOAD' }, null), // effectively, force other tabs (in same browser) to reload tokens from localStorage
  ]);

  res.clearCookie(JWT_COOKIE);
  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Logout Other Session (including satellite)
 * invalidate (remove) current JWT
 */
const logoutOther = async (req: Request, args: unknown): Promise<StatusResponse & { count: number }> => {
  const { userId, userTenants } = auth(req);
  const { refreshToken, coordinates } = await refreshTokenSchema.validate(args);

  const [revokedCount] = await Promise.all([
    token.revokeOthers(userId, refreshToken),
    AuthEvent.log(userId, 'logoutOther', req.ua, req.ip, coordinates),
    notifySync(
      userTenants[0] ? mongoId(userTenants[0]) : null,
      { userIds: [userId], event: 'AUTH-RENEW-TOKEN' },
      { extra: { revokeAllTokensByUserId: userId } },
    ), // force other clients to renew (logout), also kick out in satellite
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
  const { provider, code, isPublic, force, coordinates, clientHash } = await loginCommon
    .concat(oAuth2Schema)
    .validate(args);

  if (!Object.keys(USER.OAUTH2.PROVIDER).includes(provider)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [oAuthPayload] = await Promise.all([oAuth2Decode(provider, code), authenticateClient(clientHash)]);

  const oAuthId = `${provider}#${oAuthPayload.subId}`;
  const existingUser = await User.findOne({ oAuth2s: oAuthId, ...activeCond }, userNormalSelect).lean();

  // login if user exists
  if (existingUser) {
    const [tokensResponse, updatedUser] = await Promise.all([
      token.generate(existingUser, { isPublic, force, ip: req.ip, ua: req.ua }),
      clearExpiredUserSuspension(existingUser),
      AuthEvent.log(existingUser._id, 'oauth', req.ua, req.ip, coordinates, `oauth login ${oAuthId}`),
      notifySync(
        existingUser.tenants[0] || null,
        { userIds: [existingUser._id], event: 'AUTH-LOGIN', msg: loginMsg(existingUser.locale, req.ip) },
        null,
      ),
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
  const downloadedAvatarUrl =
    !!oAuthPayload.avatarUrl && (await storage.downloadFromUrlAndSave(oAuthPayload.avatarUrl));
  const createdUser = new User<Partial<UserDocument>>({
    name: oAuthPayload.email?.split('@')[0] || 'New User',
    flags: DEFAULTS.USER.FLAGS,
    emails: oAuthPayload.email ? [oAuthPayload.email.toLowerCase()] : [],
    password: User.genValidPassword(), // generate a valid , but random password
    oAuth2s: [`${provider}#${oAuthPayload.subId}`],
    ...(downloadedAvatarUrl && { avatarUrl: downloadedAvatarUrl }),
    tenants: [], // non school-created users has no tenants
  });
  await createdUser.save();

  const [tokensResponse, registeredUser] = await Promise.all([
    token.generate(createdUser, { isPublic, force: true, ip: req.ip, ua: req.ua }),
    User.findOne({ _id: createdUser, ...activeCond }, userNormalSelect).lean(), // read back with proper selected fields
    AuthEvent.log(createdUser._id, 'oauth', req.ua, req.ip, coordinates, `oauth register ${oAuthId}`),
  ]);

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
  return { ...tokensResponse, user: registeredUser! };
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
    User.findOne({ emails: { $in: [email, email.toUpperCase()] }, ...activeCond }, '_id').lean(), // check if either lowerCase() or upperCase() email is taken
    authenticateClient(clientHash),
  ]);

  if (existingUser) throw { statusCode: 400, code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED };

  // create a new user & store into database, password encryption is achieved in model hook
  const createdUser = await User.create<Partial<UserDocument>>({
    name,
    flags: DEFAULTS.USER.FLAGS,
    emails: [email.toUpperCase()], // email not yet verified
    password,
    roles: [],
    tenants: [], // non school-created users has no tenants
  });

  const [tokensResponse, createdUserReadBack] = await Promise.all([
    token.generate(createdUser, { isPublic, force: true, ip: req.ip, ua: req.ua }),
    User.findOne({ _id: createdUser, ...activeCond }, userNormalSelect).lean(), // read back with proper selected fields
    AuthEvent.log(createdUser._id, 'register', req.ua, req.ip, coordinates),
  ]);
  mail.confirmEmail(name, createdUser.locale, email); // no need to wait, sending email takes time

  if (!createdUserReadBack) {
    log('error', 'authController:register()', args, createdUser._id);
    throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
  }

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions); // update cookie only for successful token
  return { ...tokensResponse, user: createdUserReadBack };
};

/**
 * Renew Tokens (access & refresh)
 * generate (access & refresh) tokens & updated userProfile (note: accessToken is not needed, possibly expired)
 */
const renewToken = async (req: Request, res: Response, args: unknown): Promise<AuthSuccessfulResponse> => {
  const { refreshToken, isPublic, coordinates, clientHash } = await renewTokenSchema.validate(args);

  const [[prefix, userId]] = await Promise.all([token.verifyStrings(refreshToken), authenticateClient(clientHash)]);
  if (prefix !== REFRESH_TOKEN_PREFIX || !userId) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };

  const user = await User.findOne({ _id: userId, ...activeCond }, userNormalSelect).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tokensResponse = await token.renew(user, refreshToken, { isPublic, ip: req.ip, ua: req.ua });

  const remark = `oldToken: ${refreshToken}, newToken: ${tokensResponse.refreshToken}`;
  const [updatedUser] = await Promise.all([
    clearExpiredUserSuspension(user),
    AuthEvent.log(user._id, 'renew', req.ua, req.ip, coordinates, remark),
    notifySync(null, { userIds: [user._id], event: 'AUTH-RELOAD' }, null), // effectively, force other tabs (in same browser) to reload tokens from localStorage
  ]);

  res.cookie(JWT_COOKIE, tokensResponse.accessToken, cookieOptions);

  return { ...tokensResponse, user: updatedUser };
};

/**
 * Get Action (RESTful)
 */
const getHandler: RequestHandler<{ action: GetAction; extra?: string }> = async (req, res, next) => {
  const { action, extra } = req.params;
  try {
    switch (action) {
      case 'authServiceToken':
        // eslint-disable-next-line no-case-declarations
        const { clientId, token, redirectUri } = await authServiceToken(req, { client: extra });
        return res.redirect(200, `${redirectUri}?clientId=${clientId}&token=${token}`);
      case 'authServiceUserInfo':
        return res.status(200).json({ data: await authServiceUserInfo(req, { token: extra }) });
      case 'isEmailAvailable':
        return res.status(200).json({ data: await isEmailAvailable(req, { email: extra }) });
      case 'listApiKeys':
        return res.status(200).json({ data: await listApiKeys(req) });
      case 'listSockets':
        return res.status(200).json({ data: await listSockets(req) });
      case 'listTokens':
        return res.status(200).json({ data: await listTokens(req) });
      case 'loginToken':
        return res.status(200).json({ data: await loginToken(req, req.body) });
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
const postHandler: RequestHandler<{ action: PostAction }> = async (req, res, next) => {
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
      case 'sendEmailVerification':
        return res.status(200).json(await sendEmailVerification(req, req.body));
      case 'sendMessengerVerification':
        return res.status(200).json(await sendMessengerVerification(req, req.body));
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  addApiKey,
  removeApiKey,
  listApiKeys,
  authServiceToken,
  authServiceUserInfo,
  getHandler,
  deregister,
  isEmailAvailable,
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
  postHandler,
  register,
  renewToken,
  sendEmailVerification,
  sendMessengerVerification,
  update,
  updateHandler,
  verifyEmail,
};
