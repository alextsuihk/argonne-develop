/**
 * Controller: Tenants
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import DatabaseEvent from '../models/event/database';
import type { Id, TenantDocument } from '../models/tenant';
import Tenant, { searchableFields } from '../models/tenant';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import { messageToAdmin } from '../utils/chat';
import { idsToString, randomString } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark' | 'updateCore';

const { MSG_ENUM } = LOCALE;
const { USER } = LOCALE.DB_ENUM;

const { assertUnreachable, auth, hubModeOnly, DELETED, DELETED_LOCALE, isRoot, paginateSort, searchFilter } = common;
const { idSchema, querySchema, remarkSchema, removeSchema, tenantCoreSchema, tenantExtraSchema } = yupSchema;

export const select = (userRoles?: string[]) => `${common.select(userRoles)} -apiKey -meta`;

/**
 * (helper) transform
 */
const transform = (tenant: TenantDocument & Id, showAuthServices = false): TenantDocument & Id => ({
  ...tenant,
  ...(showAuthServices
    ? tenant.authServices.map(authService => {
        const [clientId, , redirectUri, , friendKey] = authService.split('#'); // hide clientSecret & select
        return `${friendKey ?? ''}#${clientId}#${redirectUri}`;
      })
    : []),
});

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<TenantDocument & Id> => {
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

  return transform(tenant, true);
};

/**
 * Create New Tenant (core)
 * first tenantAdmin is also created, for system-generated data
 */
const create = async (req: Request, args: unknown): Promise<TenantDocument & Id> => {
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
  return transform(tenant.toObject(), true);
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
const find = async (req: Request, args: unknown): Promise<(TenantDocument & Id)[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<TenantDocument>(searchableFields, { query });
  const tenants = await Tenant.find(filter, select(req.userRoles)).lean();
  return tenants.map(tenant =>
    transform(tenant, isRoot(req.userRoles) || (!!req.userId && idsToString(tenant.admins).includes(req.userId))),
  );
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

    res.status(200).json({
      meta: { total, ...options },
      data: tenants.map(tenant =>
        transform(tenant, isRoot(req.userRoles) || (!!req.userId && idsToString(tenant.admins).includes(req.userId))),
      ),
    });
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

  const original = await Tenant.findByIdAndUpdate(id, {
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
  }).lean();

  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG):${original.name.enUS}, (繁):${original.name.zhHK}, (简):${original.name.zhCN} [/tenants/${id}]`;
  const msg = {
    enUS: `A tenant is removed: ${common}.`,
    zhCN: `刚删除组织 ：${common}。`,
    zhHK: `剛刪除組織 ：${common}。`,
  };

  const users = await User.find({ tenants: id }, '_id').lean();

  await Promise.all([
    User.updateMany({ tenants: id }, { $pull: { tenants: id } }),
    original.logoUrl && storage.removeObject(original.logoUrl), // delete file in Minio if exists
    messageToAdmin(msg, userId, userLocale, userRoles, [], `TENANT#${id}`),
    DatabaseEvent.log(userId, `/tenants/${id}`, 'DELETE', { remark, original, users: idsToString(users) }),
    notifySync('_SYNC-ONLY', { tenantId: id }, { tenantIds: [id] }),
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
 * Update Tenant (core)
 * !note: ONLY root could update
 */
const updateCore = async (req: Request, args: unknown): Promise<TenantDocument & Id> => {
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
    notifySync('_SYNC-ONLY', { tenantId: id }, { tenantIds: [id] }),
  ]);
  if (tenant) return transform(tenant, true);
  log('error', `tenantController:updateCore()`, { id, code, ...fields }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Tenant (non-core)
 * !note: for tenantAdmins to update non-core portion (either in satellite or HQ mode)
 */
const updateExtra = async (req: Request, args: unknown): Promise<TenantDocument & Id> => {
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

    notifySync(
      '_SYNC-ONLY',
      { tenantId: id },
      {
        tenantIds: [id],
        ...(minioAddItems.length && { minioAddItems }),
        ...(minioRemoveItems.length && { minioRemoveItems }),
      },
    ),
  ]);
  if (tenant) return transform(tenant, isRoot(userRoles) || idsToString(tenant.admins).includes(userId));
  log('error', `tenantController:updateExtra()`, { id, htmlUrl, logoUrl, ...fields }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
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
  updateById,
  updateCore,
  updateExtra,
};
