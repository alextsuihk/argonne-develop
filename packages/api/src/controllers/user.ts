// TODO: (idea) create/delete/changePassword of jupyter.inspire.hk

/**
 * Controller: Users
 *
 * ! primary for (school) tenantAdmin & admin
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addDays } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { Id, UserDocument } from '../models/user';
import User, { searchableFields, userTenantSelect } from '../models/user';
import { startChatGroup } from '../utils/chat';
import { idsToString, schoolYear } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';
import { TENANT_BINDING_TOKEN_PREFIX } from './tenant-binding';

type Action =
  | 'addFeature'
  | 'addSchoolHistory'
  | 'changePassword'
  | 'clearFlag'
  | 'removeFeature'
  | 'setFlag'
  | 'suspend'
  | 'updateIdentifiedAt';

const { MSG_ENUM } = LOCALE;
const { TENANT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;
const { assertUnreachable, auth, isAdmin, isRoot, paginateSort, searchFilter } = common;
const { featureSchema, flagSchema, idSchema, passwordSchema, querySchema, remarkSchema, userSchema, userSchoolSchema } =
  yupSchema;

/**
 * (helper) checkPermission
 */
const checkPermission = async (id: string, userId: string, isAdmin = false) => {
  const user = await User.findOneActive({ _id: id });
  const primaryTenant = user?.tenants[0];
  const tenant = !primaryTenant
    ? null
    : isAdmin
    ? await Tenant.findByTenantId(primaryTenant)
    : await Tenant.findByTenantId(primaryTenant, userId);

  if (user && primaryTenant && tenant?.school) return { tenant, user, schoolId: tenant.school.toString() };
  throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
};

/**
 * Hide Histories, StudentIds, Remarks if not belong to school(s)
 */
const hideSchoolHistories = (user: UserDocument & Id, tenantIds: (string | Types.ObjectId)[], schoolIds: string[]) => ({
  ...user,
  tenants: idsToString(user.tenants).filter(t => idsToString(tenantIds).includes(t)), // only show intersected tenants
  schoolHistories: user.schoolHistories.filter(h => schoolIds.includes(h.school.toString())),
  studentIds: user.studentIds.filter(studentId =>
    idsToString(tenantIds).some(tenantId => studentId.startsWith(tenantId)),
  ),
  remarks: idsToString(tenantIds).includes(user.tenants[0]?.toString() || 'NA') ? user.remarks : [], // only primary tenant could see remarks
});

/**
 * addRemark
 *
 * ROOT & primary school tenantAdmin could addRemark
 */

const addRemark = async (req: Request, args: unknown): Promise<UserDocument & Id> => {
  const { userId, userRoles } = auth(req, 'ADMIN');

  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  // TODO: check permission

  const user = await User.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: userTenantSelect, new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/users/${id}`, 'REMARK', { remark });
  // TODO: sync....
  return user;
};

/**
 * Update School & Level
 * by (school) tenantAdmin within same school
 */
const addSchoolHistory = async (req: Request, args: unknown): Promise<UserDocument & Id> => {
  const { userId: adminId } = auth(req);
  const { id, ...fields } = await idSchema.concat(userSchoolSchema).validate(args);
  const { tenant, schoolId } = await checkPermission(id, adminId); // only primary (school) tenantAdmin

  // ONLY allow to update current-year or next-year
  if (![schoolYear(0), schoolYear(1)].includes(fields.year)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [user] = await Promise.all([
    User.findByIdAndUpdate(
      id,
      {
        identifiedAt: new Date(),
        $push: { schoolHistories: { $each: [{ school: schoolId, ...fields, updatedAt: new Date() }], $position: 0 } },
      },
      { fields: userTenantSelect, new: true },
    ).lean(),
    DatabaseEvent.log(adminId, `/users/${id}`, 'addSchoolHistory', { tenantId: tenant._id.toString(), ...fields }),
    notifySync('RENEW-TOKEN', { userIds: [id] }, { userIds: [id] }), // renew-token to reload updated user
  ]);

  if (user) return hideSchoolHistories(user, [tenant._id], [schoolId]);
  log('error', 'userController:addSchoolHistory()', { id, ...fields }, adminId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * ChangePassword by school tenantAdmin or Admin
 */
const changePassword = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId: adminId, userRoles: adminRoles } = auth(req);
  const { id, password } = await idSchema.concat(passwordSchema).validate(args);
  if (!isAdmin(adminRoles)) await checkPermission(id, adminId); // only primary (school) tenantAdmin (if not ADMIN)

  await Promise.all([
    User.findByIdAndUpdate(
      id,
      { password, $addToSet: { flags: USER.FLAG.REQUIRE_PASSWORD_CHANGE } },
      { fields: userTenantSelect, new: true },
    ).lean(),
    DatabaseEvent.log(adminId, `/users/${id}`, 'changePassword', {}),
    notifySync('_SYNC-ONLY', { userIds: [id] }, { userIds: [id] }),
  ]);
  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Create
 *
 * ROOT could add publisher, advertiser, event-organizer (without tenantId)
 * tenantAdmin could new user; if school, updates identifiedAt
 *
 */
const create = async (req: Request, args: unknown): Promise<UserDocument & Id> => {
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
      const bindingToken = await token.signStrings(
        studentId ? [TENANT_BINDING_TOKEN_PREFIX, tenantId, studentId] : [TENANT_BINDING_TOKEN_PREFIX, tenantId],
        DEFAULTS.TENANT.TOKEN_EXPIRES_IN,
      );
      console.log('ADD_USER(), create tenant-binding-token, and http link', bindingToken);

      const msg = {
        enUS: `You are invited to bind tenant (${tenant.name.enUS}). To confirm, please click http://.... TODO / token`,
        zhCN: `TODO inviteToBind (${tenant.name.zhCN})>>>>>>> 。`,
        zhHK: `TODO inviteToBind (${tenant.name.zhHK}) ?>>>>>>>。`,
      };

      const chatGroup = await startChatGroup(
        tenantId,
        msg,
        [existingUser._id],
        existingUser.locale,
        `TENANT#${tenantId}#USER#${existingUser._id}`,
      );

      await Promise.all([
        DatabaseEvent.log(adminId, `/users/${existingUser._id}`, 'inviteToBind', { tenant: tenantId }),
        notifySync('CHAT-GROUP', { userIds: [existingUser] }, { chatGroupIds: [chatGroup] }),
      ]);
    }

    throw { statusCode: 400, code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED }; // send back alert to tenantAdmin or ROOT
  }

  // school.tenant should be on the top if exists
  const tenants: (string | Types.ObjectId)[] = [];
  if (tenantId) tenants.push(tenantId);
  if (tenant?.school || tenant?.flags.includes(TENANT.FLAG.REPUTABLE)) tenants.push(tutorTenant._id);

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
    DatabaseEvent.log(adminId, `/users/${createdUser._id}`, 'addUser', {
      tenant: tenantId,
      user: createdUser._id.toString(),
      email,
    }),
    notifySync('RENEW-TOKEN', { userIds: [createdUser] }, { userIds: [createdUser] }), // renew-token to reload updated user
  ]);

  const user = await User.findOneActive({ _id: createdUser }, userTenantSelect);
  if (user) return user;
  log('error', 'userController:create()', { id: createdUser._id.toString() }, adminId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
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

// (helper) common code for find(), findMany(), findOne()
const findCommon = async (
  userId: string,
  userRoles: string[],
  userTenants: string[],
  args: unknown,
  getOne = false,
) => {
  const [{ id, query }, adminTenants] = await Promise.all([
    getOne ? idSchema.concat(querySchema).validate(args) : { ...(await querySchema.validate(args)), id: null },
    isRoot(userRoles) ? [] : Tenant.find({ _id: { $in: userTenants }, admins: userId }).lean(), // ROOT could see
  ]);
  if (!isRoot(userRoles) && !adminTenants.length) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const filter = searchFilter<UserDocument>(
    id ? [] : searchableFields,
    { query },
    {
      status: { $in: [USER.STATUS.ACTIVE, USER.STATUS.DELETED] },
      ...(id && { _id: id }),
      ...(!isRoot(userRoles) && { tenants: { $in: idsToString(adminTenants) } }),
    },
  );

  const schoolIds = adminTenants.map(t => t.school?.toString()).filter((s): s is string => !!s);

  return { filter, adminTenants, schoolIds };
};

/**
 * Find Multiple Users (Apollo)
 *
 * tenantAdmin could pull his users info, ROOT could get all users
 */
const find = async (req: Request, args: unknown): Promise<(UserDocument & Id)[]> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { filter, adminTenants, schoolIds } = await findCommon(userId, userRoles, userTenants, args);

  const users = await User.find(filter, userTenantSelect).lean();
  return isRoot(userRoles) ? users : users.map(user => hideSchoolHistories(user, idsToString(adminTenants), schoolIds));
};

/**
 * Find Multiple Users with queryString (RESTful)
 *
 * tenantAdmin could pull his users info, ROOT could get all users
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userRoles, userTenants } = auth(req);
    const { filter, adminTenants, schoolIds } = await findCommon(userId, userRoles, userTenants, { query: req.query });

    const options = paginateSort(req.query, { _id: 1 });

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter, userTenantSelect, options).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: isRoot(userRoles)
        ? users
        : users.map(user => hideSchoolHistories(user, idsToString(adminTenants), schoolIds)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One User by ID
 * tenantAdmin could pull his users info, ROOT could get all users
 */

//! admin could fetch anyone, school tenantAdmin could fetch any tenant
const findOne = async (req: Request, args: unknown): Promise<(UserDocument & Id) | null> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { filter, adminTenants, schoolIds } = await findCommon(userId, userRoles, userTenants, args, true);

  const user = await User.findOneActive(filter, userTenantSelect);
  return user && (isRoot(userRoles) ? user : hideSchoolHistories(user, idsToString(adminTenants), schoolIds));
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
 * suspend (only by school tenantAdmin or root)
 */
const suspend = async (req: Request, args: unknown): Promise<UserDocument & Id> => {
  const { userId: adminId, userRoles: adminRoles } = auth(req);
  const { id } = await idSchema.validate(args);
  const { tenant, schoolId } = await checkPermission(id, adminId, isRoot(adminRoles));

  const [user] = await Promise.all([
    User.findByIdAndUpdate(
      id,
      { suspension: addDays(new Date(), DEFAULTS.USER.SUSPENSION_DAY) },
      { fields: userTenantSelect, new: true },
    ).lean(),
    DatabaseEvent.log(adminId, `/users/${id}`, 'suspend', {}),
    notifySync('RENEW-TOKEN', { userIds: [id] }, { userIds: [id] }),
  ]);
  if (user) return isRoot(adminRoles) ? user : hideSchoolHistories(user, [tenant._id], [schoolId]);
  log('error', 'userController:suspend()', { id }, adminId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * updateFeature (only by admin)
 */
const updateFeature = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'addFeature' | 'removeFeature'>,
): Promise<UserDocument & Id> => {
  const { userId: adminId } = auth(req, 'ADMIN');
  const { id, feature: featureTmp } = await featureSchema.concat(idSchema).validate(args);
  const feature = featureTmp.toUpperCase(); // YUP has converted to upperCase(), just to be safe
  const { tenant, schoolId } = await checkPermission(id, adminId, true);

  if (!Object.keys(USER.FEATURE).includes(feature)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [user] = await Promise.all([
    User.findByIdAndUpdate(
      id,
      action === 'addFeature' ? { $push: { features: feature } } : { $pull: { features: feature } },
      { fields: userTenantSelect, new: true },
    ).lean(),
    DatabaseEvent.log(adminId, `/users/${id}`, action, {}),
    notifySync('RENEW-TOKEN', { userIds: [id] }, { userIds: [id] }),
  ]);
  if (user) return hideSchoolHistories(user, [tenant._id], [schoolId]);
  log('error', `userController:${action}()`, { id, feature }, adminId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * updateFlag (only by admin)
 */
const updateFlag = async (
  req: Request,
  args: unknown,
  action: Extract<Action, 'setFlag' | 'clearFlag'>,
): Promise<UserDocument & Id> => {
  const { userId: adminId } = auth(req, 'ADMIN');
  const { id, flag: flagTmp } = await flagSchema.concat(idSchema).validate(args);
  const flag = flagTmp.toUpperCase(); // YUP has converted to upperCase(), just to be safe
  const { tenant, schoolId } = await checkPermission(id, adminId, true);

  if (!Object.keys(USER.FEATURE).includes(flag)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [user] = await Promise.all([
    User.findByIdAndUpdate(id, action === 'setFlag' ? { $push: { flags: flag } } : { $pull: { flags: flag } }, {
      fields: userTenantSelect,
      new: true,
    }).lean(),
    DatabaseEvent.log(adminId, `/users/${id}`, action, {}),
    notifySync('RENEW-TOKEN', { userIds: [id] }, { userIds: [id] }),
  ]);
  if (user) return hideSchoolHistories(user, [tenant._id], [schoolId]);
  log('error', `userController:${action}()`, { id, flag }, adminId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * update IdentifiedAt
 * (by ADMIN)
 */
const updateIdentifiedAt = async (req: Request, args: unknown): Promise<UserDocument & Id> => {
  const { userId: adminId } = auth(req, 'ADMIN'); // only ADMIN could verify user
  const { id } = await idSchema.validate(args);
  const { tenant, schoolId } = await checkPermission(id, adminId, true);

  const [user] = await Promise.all([
    User.findByIdAndUpdate(id, { identifiedAt: new Date() }, { fields: userTenantSelect, new: true }).lean(),
    DatabaseEvent.log(adminId, `/users/${id}`, 'updateIdentifiedAt', {}),
    notifySync('RENEW-TOKEN', { userIds: [id] }, { userIds: [id] }), // renew-token to reload updated user
  ]);
  if (user) return hideSchoolHistories(user, [tenant._id], [schoolId]);
  log('error', 'userController:updateIdentifiedAt()', { id }, adminId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update by ID (RESTful)
 */
const updateById: RequestHandler<{ id: string; action: Action }> = async (req, res, next) => {
  const { id, action } = req.params;

  try {
    switch (action) {
      case 'addFeature':
      case 'removeFeature':
        return res.status(200).json({ data: await updateFeature(req, { id, ...req.body }, action) });
      case 'setFlag':
      case 'clearFlag':
        return res.status(200).json({ data: await updateFlag(req, { id, ...req.body }, action) });
      case 'addSchoolHistory':
        return res.status(200).json({ data: await addSchoolHistory(req, { id, ...req.body }) });
      case 'changePassword':
        return res.status(200).json({ data: await changePassword(req, { id, ...req.body }) });
      case 'suspend':
        return res.status(200).json({ data: await suspend(req, { id, ...req.body }) });
        return;
      case 'updateIdentifiedAt':
        return res.status(200).json({ data: await updateIdentifiedAt(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  addSchoolHistory,
  changePassword,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  suspend,
  updateById,
  updateFeature,
  updateFlag,
  updateIdentifiedAt,
};
