// TODO: create/delete/changePassword of jupyter.inspire.hk

/**
 * Controller: Users
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { userIdSchema } from '@argonne/common/src/validators';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User, { searchableFields, userNormalSelect, userTenantSelect } from '../models/user';
import { startChatGroup } from '../utils/chat';
import { idsToString, schoolYear } from '../utils/helper';
import { notify } from '../utils/messaging';
import storage from '../utils/storage';
import syncSatellite from '../utils/sync-satellite';
import token from '../utils/token';
import common from './common';

type UpdateAction =
  | 'addPaymentMethod'
  | 'clearFeature'
  | 'removePaymentMethod'
  | 'setFeature'
  | 'suspend'
  | 'updateLocale'
  | 'updateNetworkStatus'
  | 'updateSchool'
  | 'unlockSchool'
  | 'verifyId';

const { MSG_ENUM } = LOCALE;
const { SYSTEM, TENANT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;
const { assertUnreachable, auth, authGetUser, isRoot, paginateSort, searchFilter } = common;
const {
  idSchema,
  querySchema,
  tenantIdSchema,
  userFeatureSchema,
  userLocaleSchema,
  userNetworkStatusSchema,
  userPaymentMethodsSchema,
  userProfileSchema,
  userSchema,
  userSchoolSchema,
} = yupSchema;

/**
 * Hide Histories not belong to school(s)
 */
const hideHistories = (user: LeanDocument<UserDocument>, tenantIds: string[], schoolIds: string[]) => ({
  ...user,
  histories: user.histories.filter(h => schoolIds.includes(h.school.toString())),
  studentIds: user.studentIds.filter(studentId => tenantIds.some(tenantId => studentId.startsWith(tenantId))),
});

/**
 * Helper: save update, send notification (by user)
 */
const saveUpdate = async (
  userId: string,
  action: UpdateAction | 'updateProfile',
  updateQuery: UpdateQuery<UserDocument>,
  event: Record<string, unknown>,
) => {
  const [updatedUser] = await Promise.all([
    User.findByIdAndUpdate(userId, updateQuery, { fields: userNormalSelect, new: true }).lean(),
    notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(userId, `/users/${userId}`, action, event),
    syncSatellite({ userIds: [userId] }, { userIds: [userId] }),
  ]);

  return updatedUser!;
};

/**
 * Helper: notify user & sync-satellite (for admin update)
 */
const notifyAndSyncSatellite = async (
  adminId: string,
  userId: string,
  action: UpdateAction | 'addUser' | 'inviteToBind',
  event: Record<string, unknown>,
  skipNotify = false,
) =>
  Promise.all([
    !skipNotify && notify([userId], 'RE-AUTH'), // force all sessions (access tokens) to reload user
    DatabaseEvent.log(adminId, `/users/${userId}`, action, event),
    syncSatellite({ userIds: [userId] }, { userIds: [userId] }),
  ]);

/**
 * Create
 *
 * ROOT could add publisher, advertiser, event-organizer (without tenantId)
 * tenantAdmin could new user; if school, updates identifiedAt
 *
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId: adminId, userRoles } = auth(req);
  const { tenantId, email, name, studentId } = await userSchema.validate(args);

  if (!isRoot(userRoles) && !tenantId) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [tutorTenant, tenant, existingUser] = await Promise.all([
    Tenant.findTutor(),
    tenantId ? Tenant.findByTenantId(tenantId, adminId) : null,
    User.findOneActive({ emails: { $in: [email, email.toUpperCase()] } }, userTenantSelect), // check if either lowerCase() or upperCase() email is taken
  ]);

  if (existingUser) {
    if (tenantId && tenant) {
      if (idsToString(existingUser.tenants).includes(tenantId)) return existingUser;

      // send a message to user with tenant-binding-token

      const bindingToken = await token.signEvent(
        studentId ? `${tenantId}#${studentId}` : tenantId,
        'tenant',
        DEFAULTS.TENANT.TOKEN_EXPIRES_IN,
      );
      console.log('ADD_USER(), create tenant-binding-token, and http link', bindingToken);

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
        notify([existingUid], 'CHAT', { chatGroupIds: [chatGroup._id.toString()] }),
        notifyAndSyncSatellite(adminId, existingUid, 'inviteToBind', { tenant: tenantId }, true),
      ]);
    }

    throw { statusCode: 400, code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED }; // send back alert to tenantAdmin or ROOT
  }

  // school.tenant should be on the top if exists
  const tenants: string[] = [];
  if (tenantId) tenants.push(tenantId);
  if (tenant?.school || tenant?.flags.includes(TENANT.FLAG.REPUTABLE)) tenants.push(tutorTenant._id.toString());

  const createdUser = new User<Partial<UserDocument>>({
    name,
    flags: DEFAULTS.USER.FLAGS,
    emails: [email.toUpperCase()], // indicating email is not yet verified
    password: User.genValidPassword(),
    tenants,
    ...(tenantId && tenant?.school && studentId && { studentIds: [`${tenantId}#${studentId}`] }),
    ...(tenant?.school && tenant?.flags.includes(TENANT.FLAG.REPUTABLE) && { identifiedAt: new Date() }),
  });

  await Promise.all([
    createdUser.save(),
    notifyAndSyncSatellite(adminId, createdUser._id.toString(), 'addUser', {
      tenant: tenantId,
      user: createdUser._id.toString(),
      email,
    }),
  ]);

  return (await User.findOneActive({ _id: createdUser }, userTenantSelect))!; // read back with proper selected fields
};

/**
 * Create (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, req.body) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple Users (Apollo)
 *
 * tenantAdmin could pull user info, ROOT could "also" pull users without tenants (such as publisherAdmin, etc)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>[]> => {
  const { userId, userRoles, userTenants } = auth(req);
  const [{ query }, adminTenants] = await Promise.all([
    querySchema.validate(args),
    Tenant.find({ id: { $in: userTenants }, admins: userId }).lean(),
  ]);
  if (!isRoot(userRoles) && !adminTenants.length) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const filter = searchFilter<UserDocument>(
    searchableFields,
    { query },
    {
      status: USER.STATUS.ACTIVE,
      ...(isRoot(userRoles) && adminTenants.length
        ? { $or: [{ tenants: [] }, { tenants: { $in: idsToString(adminTenants) } }] }
        : isRoot(userRoles)
        ? { tenants: [] }
        : { tenants: { $in: idsToString(adminTenants) } }),
    },
  );

  const users = await User.find(filter, userTenantSelect).lean();
  const schoolIds = adminTenants.map(t => t.school?.toString()).filter((s): s is string => !!s);
  return users.map(user => hideHistories(user, idsToString(adminTenants), schoolIds));
};

/**
 * Find Multiple Users with queryString (RESTful)
 *
 * tenantAdmin could pull user info, ROOT could "also" pull users without tenants (such as publisherAdmin, etc)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userRoles, userTenants } = auth(req);
    const [{ query }, adminTenants] = await Promise.all([
      querySchema.validate({ query: req.query }),
      Tenant.find({ id: { $in: userTenants }, admins: userId }).lean(),
    ]);
    if (!isRoot(userRoles) && !adminTenants.length) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

    const filter = searchFilter<UserDocument>(
      searchableFields,
      { query },
      {
        status: USER.STATUS.ACTIVE,
        ...(isRoot(userRoles) && adminTenants.length
          ? { $or: [{ tenants: [] }, { tenants: { $in: idsToString(adminTenants) } }] }
          : isRoot(userRoles)
          ? { tenants: [] }
          : { tenants: { $in: idsToString(adminTenants) } }),
      },
    );
    const options = paginateSort(req.query, { _id: 1 });

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter, userTenantSelect, options).lean(),
    ]);

    const schoolIds = adminTenants.map(t => t.school?.toString()).filter((s): s is string => !!s);
    res.status(200).json({
      meta: { total, ...options },
      data: users.map(user => hideHistories(user, idsToString(adminTenants), schoolIds)),
    });
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
    Tenant.find({ id: { $in: userTenants }, admins: userId }).lean(),
  ]);

  if (!isRoot(userRoles) && !adminTenants.length) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const filter = searchFilter<UserDocument>(
    searchableFields,
    { query },
    {
      _id: id,
      status: USER.STATUS.ACTIVE,
      ...(isRoot(userRoles) && adminTenants.length
        ? { $or: [{ tenants: [] }, { tenants: { $in: idsToString(adminTenants) } }] }
        : isRoot(userRoles)
        ? { tenants: [] }
        : { tenants: { $in: idsToString(adminTenants) } }),
    },
  );

  const schoolIds = adminTenants.map(t => t.school?.toString()).filter((s): s is string => !!s);
  const user = await User.findOneActive(filter, userTenantSelect);
  return user && hideHistories(user, idsToString(adminTenants), schoolIds);
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
 * updateFeature
 */
const updateFeature = async (
  req: Request,
  args: unknown,
  action: Extract<UpdateAction, 'clearFeature' | 'setFeature'>,
): Promise<LeanDocument<UserDocument>> => {
  const [user, { feature: featureTmp }] = await Promise.all([authGetUser(req), userFeatureSchema.validate(args)]);
  const feature = featureTmp.toUpperCase(); // YUP has converted to upperCase(), just to be safe

  if (!Object.keys(USER.FEATURE).includes(feature)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  if (action === 'setFeature' ? user.features.includes(feature) : !user.features.includes(feature))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return saveUpdate(
    user._id.toString(),
    action,
    action === 'setFeature' ? { $push: { features: feature } } : { $pull: { features: feature } },
    { feature },
  );
};

/**
 * updateLocale
 */
const updateLocale = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const [user, { locale }] = await Promise.all([authGetUser(req), userLocaleSchema.validate(args)]);

  if (!Object.keys(SYSTEM.LOCALE).includes(locale)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // re-verify locale value (YUP has verified already)

  return saveUpdate(user._id.toString(), 'updateLocale', { locale }, { original: user.locale, new: locale });
};

/**
 * updateNetworkStatus
 */
const updateNetworkStatus = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId } = auth(req);
  const { networkStatus } = await userNetworkStatusSchema.validate(args);
  if (!Object.keys(USER.NETWORK_STATUS).includes(networkStatus) || networkStatus === USER.NETWORK_STATUS.OFFLINE)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // make no sense to set OFFLINE (auto-detected by socket-server)

  return saveUpdate(
    userId,
    'updateNetworkStatus',
    networkStatus === USER.NETWORK_STATUS.ONLINE ? { $unset: { networkStatus: 1 } } : { networkStatus },
    { networkStatus },
  );
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
    return saveUpdate(userId, action, { $push: { paymentMethods: fields } }, fields);
  }

  // removePaymentMethod
  const [original, { id }] = await Promise.all([authGetUser(req), idSchema.validate(args)]);

  const originalPaymentMethod = original.paymentMethods.find(p => p._id?.toString() === id);
  if (!originalPaymentMethod) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return saveUpdate(userId, action, { $pull: { paymentMethods: { _id: id } } }, { originalPaymentMethod });
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

  // ONLY allow to update current-year or next-year
  if (![schoolYear(0), schoolYear(1)].includes(fields.year)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tenant = await Tenant.findByTenantId(tenantId, adminId); // only tenantAdmin could proceed
  if (!tenant.school) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const user = await User.findOneAndUpdate(
    { _id: id, 'tenants.0': tenantId }, // only tenants[0] (primary tenant) could update histories
    {
      identifiedAt: new Date(),
      $push: { histories: { $each: [{ school: tenant.school, ...fields }], $position: 0 } },
    },
    { fields: userTenantSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await notifyAndSyncSatellite(adminId, id, 'updateSchool', { tenantId, ...fields });
  return user;
};

/**
 * Verify UserId
 * (by ADMIN)
 */
const verifyId = async (req: Request, args: unknown): Promise<LeanDocument<UserDocument>> => {
  const { userId: adminId } = auth(req, 'ADMIN'); // only ADMIN could verify user
  const { userId } = await userIdSchema.validate(args);

  const user = await User.findOneAndUpdate(
    { _id: userId, status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } },
    { identifiedAt: new Date() },
    { fields: userTenantSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await notifyAndSyncSatellite(adminId, userId, 'verifyId', {});

  return user;
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
      case 'addPaymentMethod':
      case 'removePaymentMethod':
        return res.status(200).json({ data: await updatePaymentMethod(req, req.body, action) });
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
      case 'unlockSchool':
        console.log('school TenantAdmin could unlock school');
        return;
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
  updateNetworkStatus,
  updatePaymentMethod,
  updateProfile,
  updateAction,
  updateSchool,
  verifyId,
};
