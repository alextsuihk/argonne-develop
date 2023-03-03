/**
 * Controller: Typographies
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import type { TypographyDocument } from '../models/typography';
import Typography, { searchableFields } from '../models/typography';
import { messageToAdmin } from '../utils/chat';
import syncSatellite from '../utils/sync-satellite';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark' | 'addCustom' | 'removeCustom';

const { MSG_ENUM } = LOCALE;
const { assertUnreachable, auth, hubModeOnly, DELETED, DELETED_LOCALE, isAdmin, paginateSort, searchFilter, select } =
  common;
const { idSchema, querySchema, remarkSchema, removeSchema, tenantIdSchema, typographyCustomSchema, typographySchema } =
  yupSchema;

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<LeanDocument<TypographyDocument>> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const typography = await Typography.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();

  if (!typography) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/typographies/${id}`, 'REMARK', { remark });
  return typography;
};

/**
 * Create New Typography
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<TypographyDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { typography: fields } = await typographySchema.validate(args);

  const typography = new Typography<Partial<TypographyDocument>>(fields);
  const { _id, title } = typography;

  const common = `(ENG): ${title.enUS}, (繁): ${title.zhHK}, (简): ${title.zhCN} [/typographies/${_id}]`;
  const msg = {
    enUS: `A new typography is added: ${common}.`,
    zhCN: `刚新增文本：${common}。`,
    zhHK: `剛新增文本：${common}。`,
  };

  await Promise.all([
    typography.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'TYPOGRAPHY'),
    DatabaseEvent.log(userId, `/typographies/${_id}`, 'CREATE', { typography: fields }),
    syncSatellite({}, { typographyIds: [_id.toString()] }),
  ]);

  return typography;
};

/**
 * Create New  (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { typography: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple s (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<TypographyDocument>[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<TypographyDocument>(searchableFields, { query });
  return Typography.find(filter, select(req.userRoles)).lean();
};

/**
 * Find Multiple Typographies with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<TypographyDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, typographies] = await Promise.all([
      Typography.countDocuments(filter),
      Typography.find(filter, select(req.userRoles), options).lean(),
    ]);
    res.status(200).json({ meta: { total, ...options }, data: typographies });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Typography by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<TypographyDocument> | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<TypographyDocument>(searchableFields, { query }, { _id: id });
  return Typography.findOne(filter, select(req.userRoles)).lean();
};

/**
 * Find One Typography by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const typography = await findOne(req, { id: req.params.id });
    typography ? res.status(200).json({ data: typography }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Typography by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await removeSchema.validate(args);

  const original = await Typography.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    {
      key: DELETED,
      title: DELETED_LOCALE,
      content: DELETED_LOCALE,
      customs: [],
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
  ).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${original.title.enUS}, (繁): ${original.title.zhHK}, (简): ${original.title.zhCN} [/typographies/${id}]`;
  const msg = {
    enUS: `A typography is removed: ${common}.`,
    zhCN: `刚删除文本：${common}。`,
    zhHK: `剛刪除文本：${common}。`,
  };
  await Promise.all([
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'TYPOGRAPHY'),
    DatabaseEvent.log(userId, `/typographies/${id}`, 'DELETE', { remark, original }),
    syncSatellite({}, { typographyIds: [id] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete Typography by ID (RESTful)
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
 * Update Typography
 */
const update = async (req: Request, args: unknown): Promise<LeanDocument<TypographyDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, typography: fields } = await idSchema.concat(typographySchema).validate(args);

  const original = await Typography.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${fields.title.enUS}, (繁): ${fields.title.zhHK}, (简): ${fields.title.zhCN} [/typographies/${id}]`;
  const msg = {
    enUS: `A typography is updated: ${common}.`,
    zhCN: `刚更新文本：${common}。`,
    zhHK: `剛更新文本：${common}。`,
  };
  const [typography] = await Promise.all([
    Typography.findByIdAndUpdate(id, fields, { fields: select(userRoles), new: true }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'TYPOGRAPHY'),
    DatabaseEvent.log(userId, `/typographies/${id}`, 'UPDATE', { original, update: fields }),
    syncSatellite({}, { typographyIds: [id] }),
  ]);
  return typography!;
};

/**
 * Add Custom Typography
 */
const addCustom = async (req: Request, args: unknown): Promise<LeanDocument<TypographyDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, tenantId, custom } = await idSchema.concat(tenantIdSchema).concat(typographyCustomSchema).validate(args);

  const tenant = await Tenant.findByTenantId(tenantId, userId, isAdmin(userRoles));

  const original = await Typography.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(tenant: ${tenantId}) (ENG): ${custom.title.enUS}, (繁): ${custom.title.zhHK}, (简): ${custom.title.zhCN} [/typographies/${id}]`;
  const msg = {
    enUS: `A custom typography is added or updated: ${tenant.name.enUS} ${common}.`,
    zhCN: `刚新增或更新文本：${tenant.name.zhCN} ${common}。`,
    zhHK: `剛新增或更新文本：${tenant.name.zhHK} ${common}。`,
  };

  const [newTypography, existingTypography] = await Promise.all([
    Typography.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false }, 'customs.tenant': { $ne: tenantId } },
      { $push: { customs: { tenant: tenantId, ...custom } } },
      { fields: select(userRoles), new: true },
    ).lean(),
    Typography.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false }, 'customs.tenant': tenantId },
      { $set: { 'customs.$': { tenant: tenantId, ...custom } } },
      { fields: select(userRoles), new: true },
    ).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, tenant.admins, `TENANT#${tenantId}-TYPOGRAPHY#${id}`),
    DatabaseEvent.log(userId, `/typographies/${id}`, 'addCustom', {
      tenant: tenantId,
      original,
      update: custom,
    }),
    syncSatellite({ tenantId }, { typographyIds: [id] }),
  ]);

  return (newTypography || existingTypography)!;
};

/**
 * Remove Custom Typography
 */
const removeCustom = async (req: Request, args: unknown): Promise<LeanDocument<TypographyDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req);
  const { id, tenantId } = await idSchema.concat(tenantIdSchema).validate(args);

  const tenant = await Tenant.findByTenantId(tenantId, userId, isAdmin(userRoles));

  const original = await Typography.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (!original.customs.some(({ tenant }) => tenant.toString() === tenantId))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(tenant: ${tenantId}) (ENG): ${original.title.enUS}, (繁): ${original.title.zhHK}, (简): ${original.title.zhCN} [/typographies/${id}]`;
  const msg = {
    enUS: `A typography is removed: ${tenant.name.enUS} (${common}).`,
    zhCN: `刚删除文本：${tenant.name.zhCN} (${common})。`,
    zhHK: `剛刪除文本：${tenant.name.zhHK} (${common})。`,
  };

  const [typography] = await Promise.all([
    Typography.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false } },
      { $pull: { customs: { tenant: tenantId } } },
      { fields: select(userRoles), new: true },
    ).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, tenant.admins, `TENANT#${tenantId}-TYPOGRAPHY#${id}`),
    DatabaseEvent.log(userId, `/typographies/${id}`, 'removeCustom', {
      tenant: tenantId,
      originalCustom: original.customs.find(({ tenant }) => tenant.toString() === tenantId),
    }),
    syncSatellite({ tenantId }, { typographyIds: [id] }),
  ]);

  return typography!;
};

/**
 * Update Typography (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id: id, typography: req.body }) });
      case 'addRemark':
        return res.status(200).json({ data: await addRemark(req, { id, ...req.body }) });
      case 'addCustom':
        return res.status(200).json({ data: await addCustom(req, { id, ...req.body }) });
      case 'removeCustom':
        return res.status(200).json({ data: await removeCustom(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  addCustom,
  addRemark,
  create,
  createNew,
  remove,
  removeById,
  removeCustom,
  find,
  findMany,
  findOne,
  findOneById,
  update,
  updateById,
};
