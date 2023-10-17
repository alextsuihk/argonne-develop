/**
 * Controller: User
 *
 * ! primary for (school) tenantAdmin & root managing their users
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addDays } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { Types, UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import School from '../models/school';
import type { TenantDocument } from '../models/tenant';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User, { activeCond, searchableFields, userTenantSelect } from '../models/user';
import { messageToAdmins, startChatGroup } from '../utils/chat';
import { schoolYear } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import mail from '../utils/sendmail';
import token, { TENANT_BINDING_TOKEN_PREFIX } from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type Action =
  | 'addFeature'
  | 'addRemark'
  | 'addSchoolHistory'
  | 'changePassword'
  | 'clearFlag'
  | 'removeFeature'
  | 'setFlag'
  | 'suspend'
  | 'updateIdentifiedAt';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;
const { assertUnreachable, auth, isRoot, paginateSort, searchFilter } = common;
const { featureSchema, flagSchema, idSchema, passwordSchema, querySchema, remarkSchema, userSchema, userSchoolSchema } =
  yupSchema;

/**
 * (helper) Hide Histories, StudentIds, Remarks if not belong to school(s)
 */
export const transform = (user: UserDocument, tenants: TenantDocument[]): UserDocument => ({
  ...user,
  tenants: user.tenants.filter(userTenant => tenants.map(t => t._id).some(tid => tid.equals(userTenant))), // only show intersected tenants
  schoolHistories: user.schoolHistories.filter(h => tenants.some(({ school }) => school && school.equals(h.school))), // only show intersected
  studentIds: user.studentIds.filter(sid => tenants.map(t => t._id).some(tid => sid.startsWith(tid.toString()))),
  ...(tenants
    .filter(({ school }) => !!school)
    .map(t => t._id)
    .some(t => user.tenants[0] && t.equals(user.tenants[0]))
    ? { remarks: user.remarks, violations: user.violations } // only "school" primary tenant could see remarks
    : { remarks: [], violations: [] }),
});

/**
 * Change User Password (by Root or school tenantAdmin only)
 */
const changePassword = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId: adminId, userRoles: adminRoles } = auth(req);
  const { id, password } = await idSchema.concat(passwordSchema).validate(args);

  const original = await User.findOne({ _id: id, ...activeCond }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tenant = original.tenants[0]
    ? await Tenant.findByTenantId(original.tenants[0], adminId, isRoot(adminRoles))
    : null;

  if (!isRoot(adminRoles) && !tenant?.school) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION }; // only isRoot or school tenantAdmin of the user (id) could proceed

  const update: UpdateQuery<UserDocument> = { password, $addToSet: { flags: USER.FLAG.REQUIRE_PASSWORD_CHANGE } };
  await Promise.all([
    User.findByIdAndUpdate(id, update).lean(),
    DatabaseEvent.log(adminId, `/users/${id}`, 'changePassword', { args }),
    notifySync(
      tenant?._id || null,
      { userIds: [original._id], event: 'AUTH-RENEW-TOKEN' },
      {
        bulkWrite: {
          users: [{ updateOne: { filter: { _id: original._id }, update } }] satisfies BulkWrite<UserDocument>,
        },
      },
    ),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Create
 *
 * ONLY school tenantAdmin could add user (not even root)
 *
 */
const create = async (req: Request, args: unknown): Promise<UserDocument> => {
  const { userId: adminId, userLocale: adminLocale } = auth(req);
  const { tenantId, email, name, studentId } = await userSchema.validate(args);

  const [tenant, existingUser] = await Promise.all([
    tenantId ? Tenant.findByTenantId(tenantId, adminId) : null,
    User.findOne({ emails: { $in: [email, email.toUpperCase()] }, ...activeCond }, userTenantSelect).lean(), // check email (verified or unverified) is taken
  ]);

  if (!tenant?.school) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION }; // only school tenantAdmin could proceed

  // create a new user
  if (!existingUser) {
    const createdUser = await User.create<Partial<UserDocument>>({
      name,
      flags: Array.from(new Set([USER.FLAG.REQUIRE_PASSWORD_CHANGE, ...DEFAULTS.USER.FLAGS])),
      emails: [email.toUpperCase()], // indicating email is not yet verified
      password: User.genValidPassword(),
      tenants: [tenant._id],
      ...(studentId && { studentIds: [`${tenant._id}#${studentId}`] }),
      identifiedAt: new Date(),
    });

    const { _id, locale } = createdUser;
    mail.resetPassword(_id, name, locale, email); // no need to wait, sending email takes time

    const [createdUserReadBack] = await Promise.all([
      User.findOne({ _id, ...activeCond }, userTenantSelect).lean(), // read back with proper select
      DatabaseEvent.log(adminId, `/users/${_id}`, 'addUser', { tenantId, user: _id.toString(), email }),
      notifySync(
        tenant._id,
        { userIds: [_id], event: 'AUTH-RENEW-TOKEN' },
        {
          bulkWrite: { users: [{ insertOne: { document: createdUser } }] satisfies BulkWrite<UserDocument> },
        },
      ), // renew-token to reload updated user
    ]);
    if (createdUserReadBack) return createdUserReadBack;
    log('error', 'userController:create()', args, adminId);
    throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
  }

  // if user already exists (having the same email)
  if (existingUser.tenants.some(t => t.equals(tenant._id))) {
    if (!existingUser.tenants[0]?.equals(tenant._id))
      // special case: require ROOT support, when existingUser has another school primary tenant
      await messageToAdmins(
        `(ROOT) Please unbind userId (${existingUser._id}) from tenantId (${existingUser.tenants[0]}), and re-bind with (${tenant._id})`,
        adminId,
        adminLocale,
        false,
        tenant.admins,
        `ROOT-MESSAGE#TENANT${tenant._id}`,
        `Request ROOT to unbind user ${existingUser._id}`,
      );

    return transform(existingUser, [tenant]);
  } else {
    // send a message to user with tenant-binding-token
    const bindingToken = await token.signStrings(
      [TENANT_BINDING_TOKEN_PREFIX, tenant._id.toString(), ...(studentId ? [studentId] : [])],
      DEFAULTS.TENANT_BINDING.TOKEN_EXPIRES_IN,
    );

    const link = `<a link="${config.appUrl}/tokens/bindTenant/${bindingToken}" target="_blank">${config.appUrl}/tokens/bindTenant</a>`;
    console.log('ADD_USER(), create tenant-binding-token, and http link', link);
    const msg = {
      enUS: `Please click the link ${link} to join school (${tenant.name.enUS})`,
      zhCN: `请点击链接加入学校 (${tenant.name.zhCN}) ${link}。`,
      zhHK: `請點擊連結加入學校 (${tenant.name.zhHK}) ${link}。`,
    };

    const { _id, locale } = existingUser;
    await Promise.all([
      startChatGroup(existingUser.tenants[0] || null, msg, [_id], locale, `TENANT#${tenant._id}#USER#${_id}`), // this is a cross-tenant chatGroup
      DatabaseEvent.log(adminId, `/users/${_id}`, 'inviteToBind', { tenant: tenant._id.toString() }),
    ]);

    throw { statusCode: 400, code: MSG_ENUM.AUTH_EMAIL_ALREADY_REGISTERED }; // send back alert to tenantAdmin or ROOT
  }
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
 * (helper) common code for find(), findMany(), findOne()
 * tenantAdmin could pull his users info, ROOT could get all users
 */
const findCommon = async (
  userId: Types.ObjectId,
  userRoles: string[],
  userTenants: string[],
  args: unknown,
  id?: string,
) => {
  const [{ query }, adminTenants] = await Promise.all([
    querySchema.validate(args),
    isRoot(userRoles) ? [] : Tenant.findAdminTenants(userId, userTenants), // ROOT could access any user (no need to pull adminTenants)
  ]);
  if (!isRoot(userRoles) && !adminTenants.length) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const filter = searchFilter<UserDocument>(
    searchableFields,
    { query },
    {
      status: { $in: [USER.STATUS.ACTIVE, USER.STATUS.DELETED] },
      ...(id && { _id: id }),
      ...(!isRoot(userRoles) && { tenants: { $in: adminTenants.map(t => t._id.toString()) } }),
    },
  );

  return { filter, adminTenants };
};

/**
 * Find Multiple Users (Apollo)
 *
 */
const find = async (req: Request, args: unknown): Promise<UserDocument[]> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { filter, adminTenants } = await findCommon(userId, userRoles, userTenants, args);

  const users = await User.find(filter, userTenantSelect).lean();
  return isRoot(userRoles) ? users : users.map(user => transform(user, adminTenants));
};

/**
 * Find Multiple Users with queryString (RESTful)
 *
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId, userRoles, userTenants } = auth(req);
    const { filter, adminTenants } = await findCommon(userId, userRoles, userTenants, {
      query: req.query,
    });

    const options = paginateSort(req.query, { _id: 1 });

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter, userTenantSelect, options).lean(),
    ]);

    res.status(200).json({
      meta: { total, ...options },
      data: isRoot(userRoles) ? users : users.map(user => transform(user, adminTenants)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One User by ID
 * tenantAdmin could pull his users info, ROOT could get all users
 */
const findOne = async (req: Request, args: unknown): Promise<UserDocument | null> => {
  const { userId, userRoles, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);
  const { filter, adminTenants } = await findCommon(userId, userRoles, userTenants, args, id);

  const user = await User.findOne(filter, userTenantSelect).lean();
  return isRoot(userRoles) ? user : user && transform(user, adminTenants);
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
 * Update User (root or "school" tenantAdmin, depending on the action)
 */
export const update = async (
  req: Request,
  args: unknown,
  action: Exclude<Action, 'changePassword'>,
): Promise<UserDocument> => {
  const { userId: adminId, userRoles: adminRoles } = auth(req);

  const { id } = await idSchema.validate(args); // extract id first
  const original = await User.findOne({ _id: id, ...activeCond }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tenant = original.tenants[0]
    ? await Tenant.findByTenantId(original.tenants[0], adminId, isRoot(adminRoles))
    : null;
  const isSchoolTenantAdmin = !!tenant?.school && !!tenant?.admins.some(a => a.equals(adminId));

  // common code: save() & notifyAndSync()
  const common = async (update: UpdateQuery<UserDocument>, event: Record<string, unknown>) => {
    const [user] = await Promise.all([
      User.findByIdAndUpdate(id, update, { fields: userTenantSelect, new: true }).lean(),
      DatabaseEvent.log(adminId, `/users/${id}`, action, event),
      notifySync(
        tenant?._id || null,
        { userIds: [original._id], event: 'AUTH-RENEW-TOKEN' },
        {
          bulkWrite: {
            users: [{ updateOne: { filter: { _id: original._id }, update } }] satisfies BulkWrite<UserDocument>,
          },
        },
      ),
    ]);
    if (user) return isRoot(adminRoles) ? user : transform(user, tenant ? [tenant] : []);

    log('error', `userController:${action}()`, args, adminId);
    throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
  };

  if (action === 'addFeature') {
    auth(req, 'ROOT'); // root only
    const { feature } = await featureSchema.validate(args);
    const uppercase = feature.toUpperCase();
    if (!Object.keys(USER.FEATURE).includes(uppercase) || original.features.includes(uppercase))
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    return common({ $addToSet: { features: uppercase } }, { args });
    //
  } else if (action === 'addRemark') {
    if (!isRoot(adminRoles) && !isSchoolTenantAdmin) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION }; // only isRoot or school tenantAdmin of the user (id) could proceed

    const { remark } = await remarkSchema.validate(args);
    return common({ $push: { remarks: { t: new Date(), u: adminId, m: remark } } }, { args });
    //
  } else if (action === 'addSchoolHistory') {
    if (!isSchoolTenantAdmin) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION }; // only isRoot or school tenantAdmin of the user (id) could proceed
    const [inputFields, school] = await Promise.all([
      userSchoolSchema.validate(args),
      tenant.school ? School.findById(tenant.school).lean() : null, // ONLY school tenantAdmin could proceed
    ]);

    if (
      !school?.levels.some(l => l.equals(inputFields.level)) || // check level is valid
      ![schoolYear(0), schoolYear(1)].includes(inputFields.year) // ONLY allow to update current-year or next-year
    )
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    const update: UpdateQuery<UserDocument> = {
      identifiedAt: new Date(),
      $push: {
        schoolHistories: { $each: [{ school: school._id, ...inputFields, updatedAt: new Date() }], $position: 0 }, // add to beginning of array
      },
    };
    return common(update, { args });
    //
  } else if (action === 'clearFlag') {
    auth(req, 'ROOT'); // root only
    const { flag } = await flagSchema.validate(args);
    return common({ $pull: { flags: flag.toUpperCase() } }, { args });
    //
  } else if (action === 'removeFeature') {
    auth(req, 'ROOT'); // root only
    const { feature } = await featureSchema.validate(args);
    return common({ $pull: { features: feature.toUpperCase() } }, { args });
    //
  } else if (action === 'setFlag') {
    auth(req, 'ROOT'); // root only
    const { flag } = await flagSchema.validate(args);
    const uppercase = flag.toUpperCase();
    if (!Object.keys(USER.FLAG).includes(uppercase) || original.flags.includes(uppercase))
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
    return common({ $addToSet: { flags: uppercase } }, { args });
    //
  } else if (action === 'suspend') {
    auth(req, 'ROOT'); // root only
    return common({ suspendUtil: addDays(original.suspendUtil || new Date(), DEFAULTS.USER.SUSPENSION_DAY) }, { args });
    // return common({ suspendUtil: addDays(Date.now(), DEFAULTS.USER.SUSPENSION_DAY) }, { args });
    //
  } else if (action === 'updateIdentifiedAt') {
    auth(req, 'ROOT'); // root only
    return common({ identifiedAt: new Date() }, { args });
    //
  } else {
    return assertUnreachable(action);
  }
};

/**
 * Update by ID (RESTful)
 */
const updateById: RequestHandler<{ id: string; action: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    if (action === 'changePassword') return res.status(200).json(await changePassword(req, { id, ...req.body }));

    return res.status(200).json({ data: await update(req, { id, ...req.body }, action) });
  } catch (error) {
    next(error);
  }
};

export default {
  changePassword,
  create,
  createNew,
  find,
  findMany,
  findOne,
  findOneById,
  update,
  updateById,
};
