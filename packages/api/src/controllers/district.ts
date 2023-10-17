/**
 * Controller: Districts
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import type { DistrictDocument } from '../models/district';
import District, { searchableFields } from '../models/district';
import DatabaseEvent from '../models/event/database';
import { messageToAdmins } from '../utils/chat';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { syncToAllSatellites } from '../utils/notify-sync';
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
const addRemark = async (req: Request, args: unknown): Promise<DistrictDocument> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const district = await District.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();
  if (!district) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/districts/${id}`, 'REMARK', { args });

  return district;
};

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<DistrictDocument> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req, 'ADMIN');
  const { district: inputFields } = await districtSchema.validate(args);

  const district = new District<Partial<DistrictDocument>>(inputFields);
  const { _id, name, region } = district;

  const common = `(ENG) ${region.enUS}-${name.enUS}, (繁): ${region.zhHK}-${name.zhHK}, (简): ${region.zhCN}-${name.zhCN} [/districts/${_id}]`;
  const msg = {
    enUS: `A new district is added: ${common}.`,
    zhCN: `刚新增地区：${common}。`,
    zhHK: `剛新增地區：${common}。`,
  };

  await Promise.all([
    district.save(),
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/districts/${_id}`, 'CREATE', { args }),
    syncToAllSatellites({
      bulkWrite: {
        districts: [{ insertOne: { document: district } }] satisfies BulkWrite<DistrictDocument>,
      },
    }),
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
const find = async (req: Request, args: unknown): Promise<DistrictDocument[]> => {
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
const findOne = async (req: Request, args: unknown): Promise<DistrictDocument | null> => {
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
  const { userId, userLocale } = auth(req, 'ADMIN');
  const { id, remark } = await removeSchema.validate(args);

  const update: UpdateQuery<DistrictDocument> = { name: DELETED_LOCALE, region: DELETED_LOCALE, deletedAt: new Date() };
  const original = await District.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { ...update, ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
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
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/districts/${id}`, 'DELETE', { args, original }),
    syncToAllSatellites({
      bulkWrite: { districts: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<DistrictDocument> },
    }),
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
const update = async (req: Request, args: unknown): Promise<DistrictDocument> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, district: updateFields } = await districtSchema.concat(idSchema).validate(args);

  const original = await District.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const { name, region } = updateFields;
  const common = `(ENG): ${region.enUS}-${name.enUS}, (繁): ${region.zhHK}-${name.zhHK}, (简): ${region.zhCN}-${name.zhCN} [/districts/${id}]`;
  const msg = {
    enUS: `A district is updated: ${common}.`,
    zhCN: `刚更新地区：${common}。`,
    zhHK: `剛更新地區：${common}}。`,
  };

  const [district] = await Promise.all([
    District.findByIdAndUpdate(id, updateFields, { fields: select(userRoles), new: true }).lean(),
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/districts/${id}`, 'UPDATE', { args, original }),
    syncToAllSatellites({
      bulkWrite: {
        districts: [{ updateOne: { filter: { _id: id }, update: updateFields } }] satisfies BulkWrite<DistrictDocument>,
      },
    }),
  ]);

  if (district) return district;
  log('error', `districtController:update()`, args, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
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
