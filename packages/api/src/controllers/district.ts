/**
 * Controller: Districts
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import type { DistrictDocument } from '../models/district';
import District, { searchableFields } from '../models/district';
import DatabaseEvent from '../models/event/database';
import { messageToAdmin } from '../utils/chat';
import syncSatellite from '../utils/sync-satellite';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { assertUnreachable, auth, DELETED_LOCALE, hubModeOnly, paginateSort, searchFilter } = common;
const { districtSchema, idSchema, querySchema, remarkSchema, removeSchema } = yupSchema;

const select = (userRoles?: string[]) => `-rates ${common.select(userRoles)}`;

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<LeanDocument<DistrictDocument>> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const district = await District.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();
  if (!district) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/districts/${id}`, 'REMARK', { remark });

  return district;
};

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<DistrictDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { district: fields } = await districtSchema.validate(args);

  const district = new District<Partial<DistrictDocument>>(fields);
  const { _id, name, region } = district;

  const common = `(ENG) ${region.enUS}-${name.enUS}, (繁): ${region.zhHK}-${name.zhHK}, (简): ${region.zhCN}-${name.zhCN} [/districts/${_id}]`;
  const msg = {
    enUS: `A new district is added: ${common}.`,
    zhCN: `刚新增地区：${common}。`,
    zhHK: `剛新增地區：${common}。`,
  };

  await Promise.all([
    district.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/districts/${_id}`, 'CREATE', { district: fields }),
    syncSatellite({}, { districtIds: [_id.toString()] }),
  ]);

  return district;
};

/**
 * Create (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { district: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<DistrictDocument>[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<DistrictDocument>(searchableFields, { query });
  return District.find(filter, select(req.userRoles)).lean();
};

/**
 * Find Multiple Districts with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<DistrictDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, districts] = await Promise.all([
      District.countDocuments(filter),
      District.find(filter, select(req.userRoles), options).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: districts });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<DistrictDocument> | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<DistrictDocument>(searchableFields, { query }, { _id: id });
  return District.findOne(filter, select(req.userRoles)).lean();
};

/**
 * Find One by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const district = await findOne(req, { id: req.params.id });
    district ? res.status(200).json({ data: district }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await removeSchema.validate(args);

  const original = await District.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    {
      name: DELETED_LOCALE,
      region: DELETED_LOCALE,
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
  ).lean();

  // const original = await District.findOneAndUpdate(
  //   { _id: id, deletedAt: { $exists: false } },
  //   { deletedAt: new Date(), ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
  // ).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  const { name, region } = original;

  // console.log('districtController::remove() original district:', new Date(), original);

  const common = `(ENG): ${region.enUS}-${name.enUS}, (繁): ${region.zhHK}-${name.zhHK}, (简): ${region.zhCN}-${name.zhCN} [/districts/${id}]`;
  const msg = {
    enUS: `A district is removed: ${common}.`,
    zhCN: `刚删除地區：${common}。`,
    zhHK: `剛刪除地區：${common}。`,
  };

  await Promise.all([
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/districts/${id}`, 'DELETE', { remark, original }),
    syncSatellite({}, { districtIds: [id] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete by ID (RESTful)
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
 * Update
 */
const update = async (req: Request, args: unknown): Promise<LeanDocument<DistrictDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, district: fields } = await districtSchema.concat(idSchema).validate(args);

  const original = await District.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { name, region } = fields;
  const common = `(ENG): ${region.enUS}-${name.enUS}, (繁): ${region.zhHK}-${name.zhHK}, (简): ${region.zhCN}-${name.zhCN} [/districts/${id}]`;
  const msg = {
    enUS: `A district is updated: ${common}.`,
    zhCN: `刚更新地区：${common}。`,
    zhHK: `剛更新地區：${common}}。`,
  };

  const [district] = await Promise.all([
    District.findByIdAndUpdate(id, fields, { fields: select(userRoles), new: true }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/districts/${id}`, 'UPDATE', { original, update: fields }),
    syncSatellite({}, { districtIds: [id] }),
  ]);

  return district!;
};

/**
 * Update by ID (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, district: req.body }) });
      case 'addRemark':
        return res.status(200).json({ data: await addRemark(req, { id, ...req.body }) });
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
  findOne,
  findOneById,
  remove,
  removeById,
  update,
  updateById,
};
