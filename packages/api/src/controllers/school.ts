/**
 * Controller: Schools
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import District from '../models/district';
import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import type { Id, SchoolDocument } from '../models/school';
import School, { searchableFields } from '../models/school';
import { messageToAdmin } from '../utils/chat';
import { randomString } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { assertUnreachable, auth, hubModeOnly, DELETED, DELETED_LOCALE, paginateSort, searchFilter, select } = common;
const { idSchema, querySchema, remarkSchema, removeSchema, schoolSchema } = yupSchema;

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<SchoolDocument & Id> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const school = await School.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();

  if (!school) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/schools/${id}`, 'REMARK', { remark });
  return school;
};

/**
 * Create New School
 */
const create = async (req: Request, args: unknown): Promise<SchoolDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const {
    school: { code, logoUrl, ...fields },
  } = await schoolSchema.validate(args);

  const [existingSchoolCode, validDistrict, levelCount] = await Promise.all([
    School.exists({ code: code.toUpperCase() }),
    District.exists({ _id: fields.district, deletedAt: { $exists: false } }),
    Level.countDocuments({ _id: { $in: fields.levels }, deletedAt: { $exists: false } }),
    logoUrl && storage.validateObject(logoUrl, userId),
  ]);
  if (existingSchoolCode || !validDistrict || levelCount !== fields.levels.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const school = new School<Partial<SchoolDocument>>({ ...fields, code, ...(logoUrl && { logoUrl }) });
  const { _id, name } = school;

  const common = `(ENG): ${name.enUS}, (繁): ${name.zhHK}, (简): ${name.zhCN} [/schools/${_id}]`;
  const msg = {
    enUS: `A new school is added: ${common}.`,
    zhCN: `刚新增学校：${common}。`,
    zhHK: `剛新增學校：${common}。`,
  };

  await Promise.all([
    school.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/schools/${_id}`, 'CREATE', { school: fields }),
    notifySync('CORE', {}, { schoolIds: [_id], ...(logoUrl && { minioAddItems: [logoUrl] }) }),
  ]);

  return school;
};

/**
 * Create New School (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { school: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple Schools (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<(SchoolDocument & Id)[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<SchoolDocument>(searchableFields, { query });
  return School.find(filter, select(req.userRoles)).lean();
};

/**
 * Find Multiple Schools with queryString (RESTful)

 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<SchoolDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, schools] = await Promise.all([
      School.countDocuments(filter),
      School.find(filter, select(req.userRoles), options).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: schools });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One School by ID
 */
const findOne = async (req: Request, args: unknown): Promise<(SchoolDocument & Id) | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<SchoolDocument>(searchableFields, { query }, { _id: id });
  return School.findOne(filter, select(req.userRoles)).lean();
};

/**
 * Find One School by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const school = await findOne(req, { id: req.params.id });
    school ? res.status(200).json({ data: school }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete School by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await removeSchema.validate(args);

  const original = await School.findByIdAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    {
      $unset: { address: 1, emi: 1, band: 1, logoUrl: 1, website: 1, funding: 1, gender: 1, religion: 1 },
      code: `${DELETED}#${randomString()}`,
      name: DELETED_LOCALE,
      phones: [],
      levels: [],
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
  ).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${original.name.enUS}, (繁): ${original.name.zhHK}, (简): ${original.name.zhCN} [/schools/${id}]`;
  const msg = {
    enUS: `A school is removed: ${common}.`,
    zhCN: `刚删除学校：${common}。`,
    zhHK: `剛刪除學校：${common}。`,
  };

  await Promise.all([
    original.logoUrl && storage.removeObject(original.logoUrl), // delete file in Minio if exists
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/schools/${original._id}`, 'DELETE', { remark, original }),
    notifySync('CORE', {}, { schoolIds: [id], ...(original.logoUrl && { minioRemoveItems: [original.logoUrl] }) }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete School by ID (RESTful)
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
 * Update School
 */
const update = async (req: Request, args: unknown): Promise<SchoolDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');

  const {
    id,
    school: { code, logoUrl, ...fields },
  } = await idSchema.concat(schoolSchema).validate(args);

  const [original, validDistrict, levelCount] = await Promise.all([
    School.findOne({ _id: id, deletedAt: { $exists: false } }).lean(),
    District.exists({ _id: fields.district, deletedAt: { $exists: false } }),
    Level.countDocuments({ _id: { $in: fields.levels }, deletedAt: { $exists: false } }),
  ]);

  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (original.code !== code.toUpperCase() || !validDistrict || levelCount !== fields.levels.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await Promise.all([
    logoUrl && original.logoUrl !== logoUrl && storage.validateObject(logoUrl, userId), // only need to validate NEW logoUrl
    original.logoUrl && original.logoUrl !== logoUrl && storage.removeObject(original.logoUrl), // remove old logoUrl from minio if exists and is different from new logoUrl
  ]);

  const common = `(ENG): ${fields.name.enUS}, (繁): ${fields.name.zhHK}, (简): ${fields.name.zhCN} [/schools/${id}]`;
  const msg = {
    enUS: `A school is updated: ${common}.`,
    zhCN: `刚更新学校：${common}。`,
    zhHK: `剛更新學校：${common}。`,
  };

  const [school] = await Promise.all([
    School.findByIdAndUpdate(
      id,
      { ...fields, ...(logoUrl ? { logoUrl } : { $unset: { logoUrl: 1 } }) },
      { fields: select(userRoles), new: true },
    ).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/schools/${id}`, 'UPDATE', { original, update: args }),
    notifySync(
      'CORE',
      {},
      {
        schoolIds: [id],
        ...(logoUrl && original.logoUrl !== logoUrl && { minioAddItems: [logoUrl] }),
        ...(original.logoUrl && original.logoUrl !== logoUrl && { minioRemoveItems: [original.logoUrl] }),
      },
    ),
  ]);
  if (school) return school;
  log('error', `classroomController:update()`, { id, ...fields }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update School (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, school: req.body }) });
      case 'addRemark':
        return res.status(200).json({ data: await addRemark(req, { id, ...req.body }) });
      default:
        assertUnreachable(action);
    }

    // update school
  } catch (error) {
    next(error);
  }
};

export default {
  addRemark,
  create,
  createNew,
  remove,
  removeById,
  find,
  findMany,
  findOne,
  findOneById,
  update,
  updateById,
};
