// TODO: create/delete/changePassword of jupyter.inspire.hk

/**
 * Controller: Users
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { userIdSchema } from '@argonne/common/src/validators';
import { addSeconds } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument, Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User, { searchableFields, userAdminSelect, userNormalSelect } from '../models/user';
import { startChatGroup } from '../utils/chat';
import { idsToString, schoolYear } from '../utils/helper';
import { notify } from '../utils/messaging';
import mail from '../utils/sendmail';
import storage from '../utils/storage';
import syncSatellite from '../utils/sync-satellite';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type UpdateAction =
  | 'addEmail'
  | 'addPaymentMethod'
  | 'bindTenant'
  | 'clearFeature'
  | 'removeEmail'
  | 'removePaymentMethod'
  | 'setFeature'
  | 'suspend'
  | 'updateLocale'
  | 'updateNetworkStatus'
  | 'updateSchool'
  | 'unbindTenant'
  | 'verifyEmail'
  | 'verifyId';

const { MSG_ENUM } = LOCALE;
const { SYSTEM, TENANT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;
const { assertUnreachable, auth, authGetUser, guest, isRoot, paginateSort, searchFilter } = common;
const {
  emailSchema,
  idSchema,
  optionalExpiresInSchema,
  querySchema,
  tenantIdSchema,
  tokenSchema,
  userFeatureSchema,
  userLocaleSchema,
  userNetworkStatusSchema,
  userPaymentMethodsSchema,
  userProfileSchema,
  userSchema,
  userSchoolSchema,
} = yupSchema;

/**
 * Create
 *
 * ROOT could add publisher, advertiser, event-organizer (without tenantId)
 * tenantAdmin could new user; if school, updates identifiedAt
 *
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId, userRoles } = auth(req);
  const { tenantId, email, name, studentId } = await userSchema.validate(args);

  if (!isRoot(userRoles) && !tenantId) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [tenant, existingUser] = await Promise.all([
    tenantId ? Tenant.findByTenantId(tenantId, userId) : null,
    User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }), // check if either lowerCase() or upperCase() email is taken
  ]);

  if (existingUser) {
    if (tenantId && tenant) {
      if (idsToString(existingUser.tenants).includes(tenantId)) return existingUser;

      // send a message to user with tenant-binding-token
      console.log('ADD_USER(), create tenant-binding-token, and http link');
      const msg = {
        enUS: `You are invited to bind tenant (${tenant.name.enUS}). To confirm, please click http://.... TODO / token`,
        zhCN: `TODO inviteToBind (${tenant.name.zhCN})>>>>>>> 。`,
        zhHK: `TODO inviteToBind (${tenant.name.zhHK}) ?>>>>>>>。`,
      };

      const existingUid = existingUser._id.toString();

      const chatGroup = await startChatGroup(
        tenantId,
        msg,
        [existingUid],
        existingUser.locale,
        `TENANT#${tenantId}-USER#${existingUid}`,
      );
      await Promise.all([
        DatabaseEvent.log(userId, `/users/${existingUid}`, 'inviteToBind', { tenant: tenantId }),
        notify([existingUid], 'CHAT', { chatGroupIds: [chatGroup._id.toString()] }),
        syncSatellite({ tenantId, userIds: [existingUid] }, { chatGroupIds: [chatGroup._id.toString()] }),
      ]);
    }

    throw { statusCode: 400, code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED }; // send back alert to tenantAdmin or ROOT
  }

  const createdUser = new User<Partial<UserDocument>>({
    name,
    flags: DEFAULTS.USER.FLAGS,
    emails: [email.toUpperCase()], // indicating email is not yet verified
    password: User.genValidPassword(),
    ...(tenantId && { tenants: [tenantId] }),
    ...(tenantId && tenant?.school && studentId && { studentIds: [`${tenantId}#${studentId}`] }),
    ...(tenant?.school && tenant?.flags.includes(TENANT.FLAG.REPUTABLE) && { identifiedAt: new Date() }),
  });
  const createdUserId = createdUser._id.toString();

  await Promise.all([
    createdUser.save(),
    DatabaseEvent.log(userId, `/users/${createdUserId}`, 'addUser', { tenant: tenantId, user: createdUserId, email }),
    tenantId && syncSatellite({ tenantId, userIds: [createdUserId] }, { userIds: [createdUserId] }),
  ]);

  return (await User.findOneActive({ _id: createdUser }, userAdminSelect))!; // read back with proper selected fields
};

/**
 * Create (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { user: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple Users (Apollo)
 *
 * ! only ROOT or school tenantAdmin could pull user info
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>[]> => {
  const { userId, userRoles, userTenants } = auth(req);
  const [{ query }, adminTenants] = await Promise.all([
    querySchema.validate(args),
    isRoot(userRoles) ? await Tenant.find({ id: { $in: userTenants }, admins: userId }).lean() : [],
  ]);
  if (!isRoot(userRoles) && !adminTenants.length) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const filter = searchFilter<UserDocument>(
    searchableFields,
    { query },
    { status: USER.STATUS.ACTIVE, ...(!isRoot(userRoles) && { tenants: { $in: adminTenants } }) },
  );
  return User.find(filter, userAdminSelect).lean();
};

/**
 * Find Multiple Users with queryString (RESTful)
 *
 * ! only ROOT or school tenantAdmin could pull user info
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userRoles, userTenants } = auth(req);
    const [{ query }, adminTenants] = await Promise.all([
      querySchema.validate({ query: req.query }),
      isRoot(userRoles) ? await Tenant.find({ id: { $in: userTenants }, admins: userId }).lean() : [],
    ]);
    if (!isRoot(userRoles) && !adminTenants.length) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

    const filter = searchFilter<UserDocument>(
      searchableFields,
      { query },
      { status: USER.STATUS.ACTIVE, ...(!isRoot(userRoles) && { tenants: { $in: adminTenants } }) },
    );
    const options = paginateSort(req.query, { _id: 1 });

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter, userAdminSelect, options),
    ]);
    res.status(200).json({ meta: { total, ...options }, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One User by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument> | null> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);

  const [{ query }, adminTenants] = await Promise.all([
    querySchema.validate(args),
    isRoot(userRoles) ? await Tenant.find({ id: { $in: userTenants }, admins: userId }).lean() : [],
  ]);
  if (!isRoot(userRoles) && !adminTenants.length) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const filter = searchFilter<UserDocument>(
    searchableFields,
    { query },
    { _id: id, status: USER.STATUS.ACTIVE, ...(!isRoot(userRoles) && { tenants: { $in: adminTenants } }) },
  );

  return User.findOneActive(filter, userAdminSelect); // return user even if deleted (because admin)
};

/**
 * Find One User by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    const user = await findOne(req, { id });
    user ? res.status(200).json({ data: user }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 *
 * Check if Email is available
 */
const isEmailAvailable = async (req: Request, args: unknown): Promise<boolean> => {
  const { email } = await emailSchema.validate(args);
  const user = await User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }, '-id');
  return !user;
};

/**
 * TenantAdmin Generate a token (for binding)
 */
const tenantToken = async (req: Request, args: unknown): Promise<{ token: string; expireAt: Date }> => {
  const { userId } = auth(req);
  const { tenantId, expiresIn = DEFAULTS.TENANT.TOKEN_EXPIRES_IN } = await optionalExpiresInSchema
    .concat(tenantIdSchema)
    .validate(args);

  await Tenant.findByTenantId(tenantId, userId); // only tenant.admins could generate token

  return { token: await token.signEvent(tenantId, 'tenant', expiresIn), expireAt: addSeconds(new Date(), expiresIn) };
};

/**
 * Common Code Helper: save update, send notification
 */
const saveUpdate = async (
  userId: string | Types.ObjectId,
  action: UpdateAction | 'updateProfile',
  updateQuery: UpdateQuery<UserDocument>,
  databaseEvent: Record<string, unknown>,
) => {
  const [updatedUser] = await Promise.all([
    // User.findOneAndUpdate(userId, updateQuery, { fields: userNormalSelect, new: true }).lean(),
    notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(userId, `/users/${userId}`, action, { action, ...databaseEvent }),
    syncSatellite({ userIds: [userId.toString()] }, { userIds: [userId.toString()] }),
  ]);

  return updatedUser!;
};

/**
 *  Update Email (add, remove, verify)
 */
const updateEmail = async (
  req: Request,
  args: unknown,
  action: Extract<UpdateAction, 'addEmail' | 'removeEmail' | 'verifyEmail'>,
): Promise<LeanDocument<UserDocument>> => {
  const { userId } = auth(req);
  const { email } = await emailSchema.validate(args);

  const user =
    action === 'addEmail'
      ? await User.findOneAndUpdate(
          { _id: userId, emails: { $nin: [email, email.toUpperCase()] } },
          { $push: { emails: email.toUpperCase() } },
          { fields: userNormalSelect, new: true },
        ).lean()
      : action == 'removeEmail'
      ? await User.findOneAndUpdate(
          { _id: userId, emails: { $in: [email, email.toUpperCase()] } },
          { $pull: { emails: { $in: [email, email.toUpperCase()] } } },
          { fields: userNormalSelect, new: true },
        ).lean()
      : await User.findOneAndUpdate(
          { _id: userId, emails: { $in: [email, email.toUpperCase()] } },
          { 'email.$': email },
          { fields: userNormalSelect, new: true },
        ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(userId, `/users/${userId}`, action, { email }),
    syncSatellite({ userIds: [userId.toString()] }, { userIds: [userId] }),
    action === 'addEmail' && mail.confirmEmail(user, email),
  ]);

  return user;
};

/**
 * updateFeature
 */
const updateFeature = async (
  req: Request,
  args: unknown,
  action: Extract<UpdateAction, 'clearFeature' | 'setFeature'>,
): Promise<LeanDocument<UserDocument>> => {
  const { userId } = auth(req);
  const { feature: featureTmp } = await userFeatureSchema.validate(args);
  const feature = featureTmp.toUpperCase(); // YUP has converted to upperCase(), just to be safe

  if (!Object.keys(USER.FEATURE).includes(feature)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const user =
    action === 'clearFeature'
      ? await User.findOneAndUpdate(
          { _id: userId, features: feature },
          { $pull: { features: feature } },
          { fields: userNormalSelect, new: true },
        ).lean()
      : await User.findOneAndUpdate(
          { _id: userId, features: { $ne: feature } },
          { $push: { features: feature } },
          { fields: userNormalSelect, new: true },
        ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(userId, `/users/${userId}`, action, { feature }),
    syncSatellite({ userIds: [userId.toString()] }, { userIds: [userId] }),
  ]);

  return user;
};

/**
 * updateLocale
 */
const updateLocale = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId, userLocale } = auth(req);
  const { locale } = await userLocaleSchema.validate(args);

  if (!Object.keys(SYSTEM.LOCALE).includes(locale)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // re-verify locale value (YUP has verified already)

  const [user] = await Promise.all([
    User.findOneAndUpdate({ _id: userId }, { locale }, { fields: userNormalSelect, new: true }).lean(),
    notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(userId, `/users/${userId}`, 'updateLocale', { original: userLocale, new: locale }),
    syncSatellite({ userIds: [userId.toString()] }, { userIds: [userId] }),
  ]);

  return user!;
};

/**
 * updateNetworkStatus
 */
const updateNetworkStatus = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId } = auth(req);
  const { networkStatus } = await userNetworkStatusSchema.validate(args);
  if (!Object.keys(USER.NETWORK_STATUS).includes(networkStatus) || networkStatus === USER.NETWORK_STATUS.OFFLINE)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // make no sense to set OFFLINE (auto-detected by socket-server)

  const [user] = await Promise.all([
    User.findOneAndUpdate(
      { _id: userId },
      networkStatus === USER.NETWORK_STATUS.ONLINE ? { $unset: { networkStatus: 1 } } : { networkStatus },
      { fields: userNormalSelect, new: true },
    ).lean(),
    notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(userId, `/users/${userId}`, 'updateNetworkStatus', { networkStatus }),
    syncSatellite({ userIds: [userId.toString()] }, { userIds: [userId] }),
  ]);

  return user!;
};

/**
 * updatePaymentMethod
 */
const updatePaymentMethod = async (
  req: Request,
  args: unknown,
  action: Extract<UpdateAction, 'addPaymentMethod' | 'removePaymentMethod'>,
): Promise<LeanDocument<UserDocument>> => {
  const { userId } = auth(req);

  // addPaymentMethod
  if (action === 'addPaymentMethod') {
    const fields = await userPaymentMethodsSchema.validate(args);

    const [user] = await Promise.all([
      User.findOneAndUpdate(
        { _id: userId },
        { $push: { paymentMethods: fields } },
        { fields: userNormalSelect, new: true },
      ).lean(),
      notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
      DatabaseEvent.log(userId, `/users/${userId}`, action, { fields }),
      syncSatellite({ userIds: [userId.toString()] }, { userIds: [userId] }),
    ]);

    return user!;
  }

  // removePaymentMethod
  const [original, { id }] = await Promise.all([authGetUser(req), idSchema.validate(args)]);
  if (!original || !original.paymentMethods.some(p => p._id?.toString() === id))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const user = await User.findOneAndUpdate(
    { _id: userId },
    { $pull: { paymentMethods: { _id: id } } },
    { fields: userNormalSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(userId, `/users/${userId}`, action, {
      originalPaymentMethods: original.paymentMethods.find(p => p._id?.toString() === id),
    }),
    syncSatellite({ userIds: [userId.toString()] }, { userIds: [userId] }),
  ]);

  return user;
};

/**
 * Update UserProfile (by user)
 */
const updateProfile = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId } = auth(req);
  const [user, { avatarUrl, ...fields }] = await Promise.all([authGetUser(req), userProfileSchema.validate(args)]);

  await Promise.all([
    avatarUrl &&
      user.avatarUrl !== avatarUrl &&
      storage.validateObject(avatarUrl, userId, avatarUrl.startsWith('avatarUrl-')), // only need to validate NEW avatarUrl, skip ownership check for built-in avatar
    user.avatarUrl &&
      user.avatarUrl !== avatarUrl &&
      !user.avatarUrl.startsWith('avatarUrl-') &&
      storage.removeObject(user.avatarUrl), // remove old avatarUrl from minio if exists and is different from new avatarUrl (& non built-in avatar)
  ]);

  return saveUpdate(
    userId,
    'updateProfile',
    { ...fields, ...(avatarUrl ? { avatarUrl } : { $unset: { avatarUrl: 1 } }) },
    { original: user, update: { avatarUrl, ...fields } },
  );
};

/**
 * Update School & Level
 * by (school) tenantAdmin within same school
 */
const updateSchool = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId: adminId } = auth(req);
  const { id, tenantId, ...fields } = await idSchema.concat(tenantIdSchema).concat(userSchoolSchema).validate(args);

  const [tenant, user] = await Promise.all([
    Tenant.findByTenantId(tenantId, adminId), // only tenantAdmin could proceed
    User.findOneActive({ _id: id, tenants: tenantId }),
  ]);

  if (!tenant.school) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  if (!user || ![schoolYear(0), schoolYear(1)].includes(fields.year))
    // ONLY allow to update current-year or next-year
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [updatedUser] = await Promise.all([
    User.findByIdAndUpdate(
      id,
      {
        identifiedAt: new Date(),
        $push: { histories: { $each: [{ school: tenant.school, ...fields }], $position: 0 } },
      },
      { fields: userNormalSelect, new: true },
    ).lean(),
    notify([id], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(adminId, `/users/${id}`, 'updateSchool', { tenantId, ...fields }),
    syncSatellite({ userIds: [id] }, { userIds: [id] }),
  ]);

  return updatedUser!;
};

/**
 * Confirm email is valid
 */
const verifyEmail = async (req: Request, args: unknown): Promise<StatusResponse> => {
  guest(req);
  const { token: confirmToken } = await tokenSchema.validate(args);
  const { id: email } = await token.verifyEvent(confirmToken, 'email');

  // TODO: debug
  // const original = await User.findOneActive({ emails: { $in: [email, email.toUpperCase()] }  });
  // console.log('verifyEmail original User.emails', original?.emails);

  // if (!user) throw { statusCode: 400, code: MSG_ENUM.TOKEN_ERROR };
  // // TODO:
  // const user = await User.findOneActive({ emails: { $in: [email, email.toUpperCase()] }  });

  const user = await User.findOneAndUpdate(
    { emails: { $in: [email, email.toUpperCase()] } },
    { $set: { 'emails.$': email } },
    { fields: userNormalSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.TOKEN_ERROR };

  await syncSatellite({ userIds: [user._id.toString()] }, { userIds: [user._id.toString()] });
  console.log('verifyEmail updated User.emails', user?.emails, email);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Verify UserId
 */
const verifyId = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId: adminId } = auth(req, 'ADMIN'); // only ADMIN could verify user
  const { userId } = await userIdSchema.validate(args);

  const user = await User.findOneAndUpdate(
    { _id: userId, status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } },
    { identifiedAt: new Date() },
    { fields: userNormalSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(adminId, `/users/${userId}`, 'verifyId', {}),
    syncSatellite({ userIds: [userId.toString()] }, { userIds: [userId] }),
  ]);

  return user;
};

/**
 * Get Actions (RESTful)
 */
const getAction: RequestHandler<{
  action: 'isEmailAvailable' | 'tenantToken';
  extra?: string;
  extra2?: string;
}> = async (req, res, next) => {
  const { action, extra, extra2 } = req.params;

  try {
    switch (action) {
      case 'isEmailAvailable':
        return res.status(200).json({ data: await isEmailAvailable(req, { email: extra }) });
      case 'tenantToken':
        return res.status(200).json({
          data: await tenantToken(req, { tenantId: extra, ...(Number(extra2) && { expiresIn: Number(extra2) }) }),
        });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update UserDocument (RESTful)
 */
const updateAction: RequestHandler<{ action?: UpdateAction }> = async (req, res, next) => {
  const { action } = req.params;

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await updateProfile(req, req.body) });
      case 'addEmail':
      case 'removeEmail':
        return res.status(200).json({ data: await updateEmail(req, req.body, action) });
      case 'addPaymentMethod':
      case 'removePaymentMethod':
        return res.status(200).json({ data: await updatePaymentMethod(req, req.body, action) });
      case 'bindTenant':
        console.log(
          'bindTenant, !!!!! auto unbind other school-tenants, and $push: {studentIds: `schoolId#studentId`}',
        );
        break;
      case 'clearFeature':
      case 'setFeature':
        return res.status(200).json({ data: await updateFeature(req, req.body, action) });
      case 'suspend':
        console.log('ROOT could suspend user');
        return;
      case 'updateLocale':
        return res.status(200).json({ data: await updateLocale(req, req.body) });
      case 'updateNetworkStatus':
        return res.status(200).json({ data: await updateNetworkStatus(req, req.body) });
      case 'updateSchool':
        return res.status(200).json({ data: await updateSchool(req, req.body) });
      case 'unbindTenant':
        console.log('WIP');
        break;
      case 'verifyEmail':
        return res.status(200).json({ data: await verifyEmail(req, req.body) });
      case 'verifyId':
        return res.status(200).json({ data: await verifyId(req, req.body) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  getAction,
  isEmailAvailable,
  tenantToken,
  updateEmail,
  updateNetworkStatus,
  updatePaymentMethod,
  updateProfile,
  updateAction,
  updateSchool,
  verifyEmail,
  verifyId,
};
