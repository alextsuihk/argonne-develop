/**
 * Controller: Tenants
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import type { TenantDocument } from '../models/tenant';
import Tenant, { searchableFields } from '../models/tenant';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import { messageToAdmin, startChatGroup } from '../utils/chat';
import { idsToString, randomString } from '../utils/helper';
import { notify } from '../utils/messaging';
import mail from '../utils/sendmail';
import storage from '../utils/storage';
import syncSatellite from '../utils/sync-satellite';
import token from '../utils/token';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark' | 'updateCore';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const { assertUnreachable, auth, hubModeOnly, DELETED, DELETED_LOCALE, isRoot, paginateSort, searchFilter } = common;
const {
  emailSchema,
  idSchema,
  optionalExpiresInSchema,
  querySchema,
  remarkSchema,
  removeSchema,
  tenantCoreSchema,
  tenantExtraSchema,
  tokenSchema,
  userIdSchema,
} = yupSchema;

export const select = (userRoles?: string[]) => `${common.select(userRoles)} -apiKey -meta`;

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<LeanDocument<TenantDocument>> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ROOT');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const tenant = await Tenant.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();
  if (!tenant) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/tenants/${id}`, 'REMARK', { remark });

  return tenant;
};

/**
 * Create New Tenant (core)
 * first tenantAdmin is also created, for system-generated data
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<TenantDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ROOT');
  const { tenant: fields } = await tenantCoreSchema.validate(args);

  if (await Tenant.exists({ code: fields.code.toUpperCase() }))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // duplicated code

  const tenant = new Tenant<Partial<TenantDocument>>({
    ...(fields.satelliteUrl && { apiKey: randomString() }),
    ...fields,
  });
  const { _id, name } = tenant;

  // create a system tenantAdmin (non-log-in-able)
  const admin = new User<Partial<UserDocument>>({
    status: USER.STATUS.SYSTEM,
    name: `Admin (${tenant._id})`,
    emails: [`admin-${randomString().slice(-10)}@@${tenant._id}.net`], // @@ for non-valid email (non-log-in-able)
    password: User.genValidPassword(),
    tenants: [tenant._id],
  });
  tenant.admins.push(admin._id);

  const common = `(ENG):${name.enUS}, (繁):${name.zhHK}, (简):${name.zhCN} [/tenants/${_id}]`;
  const msg = {
    enUS: `A new tenant is added: ${common}.`,
    zhCN: `刚新增组织 ：${common}。`,
    zhHK: `剛新增組織 ：${common}。`,
  };

  // as a fresh tenant, it will not have a satellite, and no need to sync
  await Promise.all([
    tenant.save(),
    admin.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], `TENANT#$_id}`),
    DatabaseEvent.log(userId, `/tenants/${_id}`, 'CREATE', { tenant: fields }),
  ]);

  if (tenant.apiKey) delete tenant.apiKey; // hide apiKey if exists
  return tenant!;
};

/**
 * Create New Tenant (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { tenant: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple Tenants (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<TenantDocument>[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<TenantDocument>(searchableFields, { query });
  return Tenant.find(filter, select(req.userRoles)).lean();
};

/**
 * Find Multiple Tenants with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<TenantDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, tenants] = await Promise.all([
      Tenant.countDocuments(filter),
      Tenant.find(filter, select(req.userRoles), options).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: tenants });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Tenant by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ROOT');
  const { id, remark } = await removeSchema.validate(args);

  const original = await Tenant.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    {
      $unset: {
        apiKey: 1,
        school: 1,
        theme: 1,
        htmlUrl: 1,
        logoUrl: 1,
        website: 1,
        satelliteUrl: 1,
        userSelect: 1,
        meta: 1,
      },
      code: `${DELETED}#${randomString()}`,
      name: DELETED_LOCALE,
      admins: [],
      supports: [],
      counselors: [],
      marshals: [],

      services: [],
      flaggedWords: [],
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
  ).lean();

  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG):${original.name.enUS}, (繁):${original.name.zhHK}, (简):${original.name.zhCN} [/tenants/${id}]`;
  const msg = {
    enUS: `A tenant is removed: ${common}.`,
    zhCN: `刚删除组织 ：${common}。`,
    zhHK: `剛刪除組織 ：${common}。`,
  };
  await Promise.all([
    original.logoUrl && storage.removeObject(original.logoUrl), // delete file in Minio if exists
    messageToAdmin(msg, userId, userLocale, userRoles, [], `TENANT#${id}`),
    DatabaseEvent.log(userId, `/tenants/${id}`, 'DELETE', { remark, original }),
    syncSatellite({ tenantId: id }, { tenantIds: [id] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete Tenant by ID (RESTful)
 */
const removeById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    res.status(200).json(await remove(req, { id: req.params.id, ...req.body }));
  } catch (error) {
    next(error);
  }
};

/**
 * Send Test Email
 * only tenantAdmins could test email
 */
const sendTestEmail = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userLocale, userName, userRoles } = auth(req);
  const { id, email } = await emailSchema.concat(idSchema).validate(args);
  const [user] = await Promise.all([
    User.findOneActive({ _id: userId }),
    Tenant.findByTenantId(id, userId, isRoot(userRoles)), // only tenantAdmins or root can proceed
  ]);

  if (!user || (!user.emails.includes(email.toUpperCase()) && !user.emails.includes(email)))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const sendSuccess = await mail.testEmail(userName, userLocale, email);
  if (!sendSuccess) throw { statusCode: 400, code: MSG_ENUM.SENDMAIL_ERROR };

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Generate a token with tenantId
 */
const tenantToken = async (req: Request, args: unknown): Promise<{ token: string; expireAt: Date }> => {
  const { userId } = auth(req);
  const { id, expiresIn = DEFAULTS.TENANT.TOKEN_EXPIRES_IN } = await idSchema
    .concat(optionalExpiresInSchema)
    .validate(args);

  await Tenant.findByTenantId(id, userId); // only tenant.admins could generate token

  return { token: await token.signEvent(id, 'tenant', expiresIn), expireAt: addSeconds(new Date(), expiresIn) };
};

const tenantTokenRestApi: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json({ data: await tenantToken(req, req.body) });
  } catch (error) {
    next(error);
  }
};

/**
 * An User binds himself to a tenant
 *  note: user (while at old tenant domain), binds to another tenant
 */
const tenantBind = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userLocale, userName, userTenants } = auth(req);
  const { token: tenantToken } = await tokenSchema.validate(args);
  const { id } = await token.verifyEvent(tenantToken, 'tenant');
  const tenant = await Tenant.findByTenantId(id);

  if (!userTenants.includes(id)) {
    const msg = {
      enUS: `${userName} (userId: ${userId}), welcome to join us ${tenant.name.enUS}.`,
      zhCN: `${userName} (userId: ${userId})，欢迎你加入我们 ${tenant.name.zhCN}。`,
      zhHK: `${userName} (userId: ${userId})，歡迎你加入我們 ${tenant.name.zhHK}。`,
    };
    await Promise.all([
      User.findByIdAndUpdate(userId, { $push: { tenants: id } }).lean(),
      startChatGroup(tenant._id, msg, [userId, ...tenant.admins], userLocale, `TENANT#${id}-USER#${userId}`),
      DatabaseEvent.log(userId, `/users/${userId}`, 'BIND', { tenant: id }),
      notify([userId], 'RE-AUTH'),
      syncSatellite({ tenantId: tenant._id, userIds: [userId] }, { userIds: [userId] }),
    ]);
  }

  return { code: MSG_ENUM.COMPLETED };
};

const tenantBindRestApi: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await tenantBind(req, req.body));
  } catch (error) {
    next(error);
  }
};

/**
 * Tenant admin unbinding an user
 * ! ONLY tenantAdmins could unbind an user
 */
const tenantUnbind = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId: adminId, userLocale: adminLocale } = auth(req);
  const { id, userId } = await idSchema.concat(userIdSchema).validate(args);
  const [tenant, defaultTenant] = await Promise.all([Tenant.findByTenantId(id, adminId), Tenant.findDefault()]);

  const user = await User.findOneAndUpdate(
    { _id: userId, tenants: id },
    { $pull: { tenants: id } },
    { new: true },
  ).lean();
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  // ensure user is in defaultTenant
  if (!idsToString(user.tenants).includes(defaultTenant._id.toString()))
    await User.findOneAndUpdate(
      { _id: userId, tenants: { $ne: defaultTenant._id } },
      { $push: { tenants: defaultTenant._id } },
    ).lean();

  const msg = {
    enUS: `${user.name}, you have been unbound ${tenant.name.enUS}.`,
    zhCN: `${user.name}，你已被解除绑定 ${tenant.name.zhCN}。`,
    zhHK: `${user.name}，你已被解除綁定 ${tenant.name.zhHK}。`,
  };
  await Promise.all([
    startChatGroup(id, msg, [adminId, userId, ...tenant.admins], adminLocale, `TENANT#${id}`),
    startChatGroup(null, msg, [userId], user.locale, `USER#${user._id}`),
    DatabaseEvent.log(adminId, `/users/${userId}`, 'UNBIND', { tenant: id, admin: adminId, user: userId }),
    notify([userId], 'RE-AUTH'),
    syncSatellite({ tenantId: id, userIds: [userId] }, { userIds: [userId] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};
const tenantUnbindRestApi: RequestHandler<{ userId: string }> = async (req, res, next) => {
  try {
    res.status(200).json(await tenantUnbind(req, req.body));
  } catch (error) {
    next(error);
  }
};

/**
 * Update Tenant (core)
 * !note: ONLY root could update
 */
const updateCore = async (req: Request, args: unknown): Promise<LeanDocument<TenantDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ROOT');
  const {
    id,
    tenant: { code, ...fields },
  } = await idSchema.concat(tenantCoreSchema).validate(args);

  const original = await Tenant.findByTenantId(id);
  if (original.code !== code.toUpperCase()) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // cannot change code

  const common = `(ENG): ${fields.name.enUS}, (繁): ${fields.name.zhHK}, (简): ${fields.name.zhCN} [/tenants/${id}]`;
  const msg = {
    enUS: `A tenant is updated (core): ${common}.`,
    zhCN: `刚更新组织  (core)：${common}。`,
    zhHK: `剛更新組織  (core)：${common}。`,
  };

  const [tenant] = await Promise.all([
    Tenant.findByIdAndUpdate(id, fields, { fields: select(userRoles), new: true }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, original.admins, `TENANT#${id}`),
    DatabaseEvent.log(userId, `/tenants/${id}`, 'UPDATE-CORE', { original, update: fields }),
    syncSatellite({ tenantId: id }, { tenantIds: [id] }),
  ]);

  return tenant!;
};

/**
 * Update Tenant (non-core)
 * !note: for tenantAdmins to update non-core portion (either in satellite or HQ mode)
 */
const updateExtra = async (req: Request, args: unknown): Promise<LeanDocument<TenantDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const {
    id,
    tenant: { htmlUrl, logoUrl, ...fields },
  } = await idSchema.concat(tenantExtraSchema).validate(args);

  const [original, adminCount, supportCount, counselorCount, marshalCount] = await Promise.all([
    Tenant.findByTenantId(id, userId, isRoot(userRoles)), // only tenantAdmins or root can update
    User.countDocuments({ _id: { $in: fields.admins }, tenants: id }),
    User.countDocuments({ _id: { $in: fields.supports }, tenants: id }),
    User.countDocuments({ _id: { $in: fields.counselors }, tenants: id }),
    User.countDocuments({ _id: { $in: fields.marshals }, tenants: id }),
  ]);

  if (
    fields.admins.length !== adminCount ||
    fields.supports.length !== supportCount ||
    fields.counselors.length !== counselorCount ||
    fields.marshals.length !== marshalCount
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    logoUrl && original.logoUrl !== logoUrl && storage.validateObject(logoUrl, userId), // only need to validate NEW logoUrl
    original.logoUrl && original.logoUrl !== logoUrl && storage.removeObject(original.logoUrl), // remove old logoUrl from minio if exists and is different from new logoUrl
    htmlUrl && original.htmlUrl !== htmlUrl && storage.validateObject(htmlUrl, userId), // only need to validate NEW htmlUrl
    original.htmlUrl && original.htmlUrl !== htmlUrl && storage.removeObject(original.htmlUrl), // remove old htmlUrl from minio if exists and is different from new logoUrl
  ]);

  const common = `(ENG): ${original.name.enUS}, (繁): ${original.name.zhHK}, (简): ${original.name.zhCN} [/tenants/${id}]`;
  const msg = {
    enUS: `A tenant is updated (non-core): ${common}.`,
    zhCN: `刚更新组织 (non-core)： ${common}。`,
    zhHK: `剛更新組織 (non-core)： ${common}。`,
  };

  const unset = {
    ...(!logoUrl && { logoUrl: 1 }),
    ...(!htmlUrl && { htmlUrl: 1 }),
  };
  const update = {
    ...fields,
    ...(logoUrl && { logoUrl }),
    ...(htmlUrl && { htmlUrl }),
    ...(Object.keys(unset).length && { $unset: unset }),
  };

  const minioAddItems: string[] = [];
  if (htmlUrl && original.htmlUrl !== htmlUrl) minioAddItems.push(htmlUrl);
  if (logoUrl && original.logoUrl !== logoUrl) minioAddItems.push(logoUrl);

  const minioRemoveItems: string[] = [];
  if (original.htmlUrl && original.htmlUrl !== htmlUrl) minioRemoveItems.push(original.htmlUrl);
  if (original.logoUrl && original.logoUrl !== logoUrl) minioRemoveItems.push(original.logoUrl);

  const [tenant] = await Promise.all([
    Tenant.findByIdAndUpdate(id, update, { fields: select(userRoles), new: true }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, [...original.admins, ...fields.admins], `TENANT#${id}`),
    DatabaseEvent.log(userId, `/tenants/${id}`, 'UPDATE-EXTRA', { original, update: fields }),
    syncSatellite(
      { tenantId: id },
      {
        tenantIds: [id],
        ...(minioAddItems.length && { minioAddItems }),
        ...(minioRemoveItems && { minioRemoveItems }),
      },
    ),
  ]);

  return tenant!;
};

/**
 * Update Tenant (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await updateExtra(req, { id, tenant: req.body }) });
      case 'addRemark':
        return res.status(200).json({ data: await addRemark(req, { id, ...req.body }) });
      case 'updateCore':
        return res.status(200).json({ data: await updateCore(req, { id, tenant: req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  addRemark,
  create,
  createNew,
  find,
  findMany,
  remove,
  removeById,
  sendTestEmail,
  tenantBind,
  tenantBindRestApi,
  tenantToken,
  tenantTokenRestApi,
  tenantUnbind,
  tenantUnbindRestApi,
  updateById,
  updateCore,
  updateExtra,
};
