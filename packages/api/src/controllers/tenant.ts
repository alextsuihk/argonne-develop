/**
 * Controller: Tenants
 *
 * ! note: Only support hubMode (as a single source of truth)
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import DatabaseEvent from '../models/event/database';
import School from '../models/school';
import type { Id, TenantDocument } from '../models/tenant';
import Tenant, { searchableFields } from '../models/tenant';
import User from '../models/user';
import { messageToAdmins } from '../utils/chat';
import { randomString } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import mail from '../utils/sendmail';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark' | 'updateCore';
type PostAction = 'sendTestEmail';

const { MSG_ENUM } = LOCALE;
const { TENANT } = LOCALE.DB_ENUM;

const { assertUnreachable, auth, hubModeOnly, DELETED, DELETED_LOCALE, isAdmin, isRoot, paginateSort, searchFilter } =
  common;
const { emailSchema, idSchema, querySchema, remarkSchema, removeSchema, tenantCoreSchema, tenantExtraSchema } =
  yupSchema;

export const select = (userRoles?: string[]) =>
  `${common.select(userRoles)} -apiKey -satelliteIp -satelliteVersion -seedings -meta`;

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

  await DatabaseEvent.log(userId, `/tenants/${id}`, 'REMARK', { args });

  return transform(tenant, true);
};

/**
 * Create New Tenant (core)
 */
const create = async (req: Request, args: unknown): Promise<TenantDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req, 'ROOT');
  const { tenant: inputFields } = await tenantCoreSchema.validate(args);

  const [school, tenantCodeTaken] = await Promise.all([
    inputFields.school ? School.exists({ _id: inputFields.school }) : null,
    Tenant.exists({ code: inputFields.code.toUpperCase() }),
  ]);
  if (tenantCodeTaken || (inputFields.school && !school)) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // duplicated code

  const tenant = new Tenant<Partial<TenantDocument>>({
    ...inputFields,
    code: inputFields.code.toUpperCase(),
    school: school?._id,
    services: inputFields.services.map(s => s.toUpperCase()).filter(x => Object.keys(TENANT.SERVICE).includes(x)), // accept only intersected services
    ...(inputFields.satelliteUrl && school && { apiKey: randomString() }), // never expires
  });
  const { _id, name } = tenant;

  const common = `(ENG):${name.enUS}, (繁):${name.zhHK}, (简):${name.zhCN} [/tenants/${_id}]`;
  const msg = {
    enUS: `A new tenant is added: ${common}.`,
    zhCN: `刚新增组织 ：${common}。`,
    zhHK: `剛新增組織 ：${common}。`,
  };

  // as a fresh tenant, it will not have a satellite, and no need to sync
  await Promise.all([
    tenant.save(),
    messageToAdmins(msg, userId, userLocale, true, tenant.admins, `TENANT#${tenant._id}`),
    DatabaseEvent.log(userId, `/tenants/${_id}`, 'CREATE', { args }),
  ]);

  if (tenant.apiKey) delete tenant.apiKey; // hide apiKey if exists
  return transform(tenant.toObject(), true);
};

// /**
//  * Create New Tenant (RESTful)
//  */
// const createNew: RequestHandler = async (req, res, next) => {
//   try {
//     res.status(201).json({ data: await create(req, { tenant: req.body }) });
//   } catch (error) {
//     next(error);
//   }
// };

/**
 * Find Multiple Tenants (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<(TenantDocument & Id)[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<TenantDocument>(searchableFields, { query });
  const tenants = await Tenant.find(filter, select(req.userRoles)).lean();
  return tenants.map(tenant =>
    transform(tenant, isRoot(req.userRoles) || tenant.admins.some(a => req.userId && a.equals(req.userId))),
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
        transform(tenant, isRoot(req.userRoles) || tenant.admins.some(a => req.userId && a.equals(req.userId))),
      ),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Tenant by ID
 *
 * (no need to push sync to satellite, satellite will be disconnected from now on)
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req, 'ROOT');
  const { id, remark } = await removeSchema.validate(args);

  const original = await Tenant.findByIdAndUpdate(id, {
    $unset: {
      apiKey: 1,
      school: 1,
      system: 1,
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
  const tenantUserIds = users.map(u => u._id.toString());

  await Promise.all([
    User.updateMany({ tenants: id }, { $pull: { tenants: id } }),
    original.logoUrl && storage.removeObject(original.logoUrl), // delete file in Minio if exists
    messageToAdmins(msg, userId, userLocale, true, original.admins, `TENANT#${id}`),

    DatabaseEvent.log(userId, `/tenants/${id}`, 'DELETE', { args, original, tenantUserIds }),
    notifySync(original._id, { userIds: [userId, ...original.admins.map(u => u._id)], event: 'TENANT' }, null), // just notify, no db sync
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
 * only admin or any tenantAdmin could test email
 */
const sendTestEmail = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userLocale, userName, userRoles } = auth(req);
  const { email } = await emailSchema.validate(args);

  const [user, isTenantAdmin] = await Promise.all([
    User.findOneActive({ _id: userId, emails: { $in: [email, email.toUpperCase()] } }),
    isAdmin(userRoles) || Tenant.exists({ admins: userId }),
  ]);
  if (!user) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (!isTenantAdmin) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  if (await mail.testEmail(userName, userLocale, email)) return { code: MSG_ENUM.COMPLETED };

  throw { statusCode: 400, code: MSG_ENUM.SENDMAIL_ERROR };
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
    tenant: { code, school, ...inputFields }, // not allow to change school
  } = await idSchema.concat(tenantCoreSchema).validate(args);

  const original = await Tenant.findByTenantId(id);
  if (original.code !== code.toUpperCase() || (school && !original.school?.equals(school)))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // cannot change code or school

  const common = `(ENG): ${inputFields.name.enUS}, (繁): ${inputFields.name.zhHK}, (简): ${inputFields.name.zhCN} [/tenants/${id}]`;
  const msg = {
    enUS: `A tenant is updated (core): ${common}.`,
    zhCN: `刚更新学校资料 (core)：${common}。`,
    zhHK: `剛更新學校資料 (core)：${common}。`,
  };

  const update: UpdateQuery<TenantDocument> = {
    ...inputFields,
    services: inputFields.services.map(s => s.toUpperCase()).filter(x => Object.keys(TENANT.SERVICE).includes(x)), // accept only intersected services
  };

  const [tenant] = await Promise.all([
    Tenant.findByIdAndUpdate(id, update, { fields: select(userRoles), new: true }).lean(),
    messageToAdmins(msg, userId, userLocale, true, original.admins, `TENANT#${id}`),

    DatabaseEvent.log(userId, `/tenants/${id}`, 'UPDATE-CORE', { args, original }),
    notifySync(
      original._id,
      { userIds: [userId, ...original.admins], event: 'TENANT' },
      { bulkWrite: { tenants: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<TenantDocument> } },
    ),
  ]);
  if (tenant) return transform(tenant, true);
  log('error', `tenantController:updateCore()`, args, userId);
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
    tenant: { htmlUrl, logoUrl, ...inputFields },
  } = await idSchema.concat(tenantExtraSchema).validate(args);

  const [original, admins, supports, counselors, marshals] = await Promise.all([
    Tenant.findByTenantId(id, userId, isRoot(userRoles)), // only tenantAdmins or root can update
    User.find({ _id: { $in: inputFields.admins }, tenants: id }).lean(),
    User.find({ _id: { $in: inputFields.supports }, tenants: id }).lean(),
    User.find({ _id: { $in: inputFields.counselors }, tenants: id }).lean(),
    User.find({ _id: { $in: inputFields.marshals }, tenants: id }).lean(),
  ]);

  if (
    inputFields.admins.length !== admins.length ||
    inputFields.supports.length !== supports.length ||
    inputFields.counselors.length !== counselors.length ||
    inputFields.marshals.length !== marshals.length
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
  const update: UpdateQuery<TenantDocument> = {
    ...inputFields,
    admins: admins.map(u => u._id),
    supports: supports.map(u => u._id),
    counselors: counselors.map(u => u._id),
    marshals: marshals.map(u => u._id),
    ...(logoUrl && { logoUrl }),
    ...(htmlUrl && { htmlUrl }),
    ...(Object.keys(unset).length && { $unset: unset }),
  };

  const addFiles: string[] = []; // add files to minio
  if (htmlUrl && original.htmlUrl !== htmlUrl) addFiles.push(htmlUrl);
  if (logoUrl && original.logoUrl !== logoUrl) addFiles.push(logoUrl);

  const removeFiles: string[] = []; // remove files from minio
  if (original.htmlUrl && original.htmlUrl !== htmlUrl) removeFiles.push(original.htmlUrl);
  if (original.logoUrl && original.logoUrl !== logoUrl) removeFiles.push(original.logoUrl);

  const [tenant] = await Promise.all([
    Tenant.findByIdAndUpdate(id, update, { fields: select(userRoles), new: true }).lean(),
    messageToAdmins(msg, userId, userLocale, isRoot(userRoles), inputFields.admins, `TENANT#${id}`),
    DatabaseEvent.log(userId, `/tenants/${id}`, 'UPDATE-EXTRA', { args, original }),
    notifySync(
      original._id,
      { userIds: [userId, ...admins.map(u => u._id)], event: 'TENANT' },
      { bulkWrite: { tenants: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<TenantDocument> } },
    ),
  ]);

  if (tenant) return transform(tenant, isRoot(userRoles) || tenant.admins.some(a => a.equals(userId)));
  log('error', `tenantController:updateExtra()`, args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Post Action (RESTful)
 */
const postHandler: RequestHandler<{ action?: PostAction }> = async (req, res, next) => {
  const { action } = req.params;
  try {
    switch (action) {
      case undefined:
        return res.status(201).json({ data: await create(req, { tenant: req.body }) });
      case 'sendTestEmail':
        return res.status(200).json(await sendTestEmail(req, req.body));
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
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
  find,
  findMany,
  postHandler,
  remove,
  removeById,
  sendTestEmail,
  updateById,
  updateCore,
  updateExtra,
};
