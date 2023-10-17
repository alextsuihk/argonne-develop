/**
 * Controller: Schools
 *
 */

import type { SchoolSchema } from '@argonne/common';
import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import District from '../models/district';
import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import type { SchoolDocument } from '../models/school';
import School, { searchableFields } from '../models/school';
import { messageToAdmins } from '../utils/chat';
import { randomString } from '../utils/helper';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { syncToAllSatellites } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { SCHOOL } = LOCALE.DB_ENUM;
const { config } = configLoader;
const { assertUnreachable, auth, hubModeOnly, DELETED, DELETED_LOCALE, paginateSort, searchFilter, select } = common;
const { idSchema, querySchema, remarkSchema, removeSchema, schoolSchema } = yupSchema;

// (helper) validate user inputFields
const validateInputs = async ({ school }: SchoolSchema) => {
  const [district, levels] = await Promise.all([
    District.exists({ _id: school.district, deletedAt: { $exists: false } }),
    Level.find({ _id: { $in: school.levels }, deletedAt: { $exists: false } }).lean(),
  ]);
  if (
    !district ||
    levels.length !== school.levels.length ||
    !Object.keys(SCHOOL.BAND).includes(school.band) ||
    !Object.keys(SCHOOL.FUNDING).includes(school.funding) ||
    !Object.keys(SCHOOL.GENDER).includes(school.gender) ||
    !Object.keys(SCHOOL.RELIGION).includes(school.religion)
  )
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return { code: school.code.toUpperCase(), district: district._id, levels: levels.map(lvl => lvl._id) };
};

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<SchoolDocument> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const school = await School.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();

  if (!school) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/schools/${id}`, 'REMARK', { args });
  return school;
};

/**
 * Create New School
 */
const create = async (req: Request, args: unknown): Promise<SchoolDocument> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req, 'ADMIN');
  const { school: inputFields } = await schoolSchema.validate(args);

  const [existingSchoolCode, { code, district, levels }] = await Promise.all([
    School.exists({ code: inputFields.code.toUpperCase() }),
    validateInputs({ school: inputFields }),
    inputFields.logoUrl && storage.validateObject(inputFields.logoUrl, userId),
  ]);
  if (existingSchoolCode || !district || levels?.length !== inputFields.levels.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const school = new School<Partial<SchoolDocument>>({
    ...inputFields,
    code, // convert to uppercase()
    district,
    levels,
  });
  const { _id, name } = school;

  const common = `(ENG): ${name.enUS}, (繁): ${name.zhHK}, (简): ${name.zhCN} [/schools/${_id}]`;
  const msg = {
    enUS: `A new school is added: ${common}.`,
    zhCN: `刚新增学校：${common}。`,
    zhHK: `剛新增學校：${common}。`,
  };

  await Promise.all([
    school.save(),
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/schools/${_id}`, 'CREATE', { args }),
    syncToAllSatellites({
      bulkWrite: { schools: [{ insertOne: { document: school } }] satisfies BulkWrite<SchoolDocument> },
      ...(inputFields.logoUrl && {
        minio: { serverUrl: config.server.minio.serverUrl, addObjects: [inputFields.logoUrl] },
      }),
    }),
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
const find = async (req: Request, args: unknown): Promise<SchoolDocument[]> => {
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
const findOne = async (req: Request, args: unknown): Promise<SchoolDocument | null> => {
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
  const { userId, userLocale } = auth(req, 'ADMIN');
  const { id, remark } = await removeSchema.validate(args);

  const update: UpdateQuery<SchoolDocument> = {
    $unset: { address: 1, emi: 1, logoUrl: 1, website: 1 },
    code: `${DELETED}#${randomString()}`,
    name: DELETED_LOCALE,
    phones: [],
    band: SCHOOL.BAND.UNSPECIFIC,
    funding: SCHOOL.FUNDING.UNSPECIFIC,
    gender: SCHOOL.GENDER.UNSPECIFIC,
    religion: SCHOOL.RELIGION.UNSPECIFIC,
    levels: [],
    deletedAt: new Date(),
  };
  const original = await School.findByIdAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { ...update, ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
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
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/schools/${original._id}`, 'DELETE', { args, original }),
    syncToAllSatellites({
      bulkWrite: { schools: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<SchoolDocument> },
      ...(original.logoUrl && {
        minio: { serverUrl: config.server.minio.serverUrl, removeObjects: [original.logoUrl] },
      }),
    }),
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
const update = async (req: Request, args: unknown): Promise<SchoolDocument> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, school: inputFields } = await idSchema.concat(schoolSchema).validate(args);

  const [original, { code, district, levels }] = await Promise.all([
    School.findOne({ _id: id, deletedAt: { $exists: false } }).lean(),
    validateInputs({ school: inputFields }),
  ]);
  if (!original || original.code !== code.toUpperCase() || !district || levels.length !== inputFields.levels.length)
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [addObject, removeObject] = await Promise.all([
    inputFields.logoUrl &&
      original.logoUrl !== inputFields.logoUrl &&
      storage.validateObject(inputFields.logoUrl, userId), // only need to validate NEW logoUrl
    original.logoUrl && original.logoUrl !== inputFields.logoUrl && storage.removeObject(original.logoUrl), // remove old logoUrl from minio if exists and is different from new logoUrl
  ]);

  const common = `(ENG): ${inputFields.name.enUS}, (繁): ${inputFields.name.zhHK}, (简): ${inputFields.name.zhCN} [/schools/${id}]`;
  const msg = {
    enUS: `A school is updated: ${common}.`,
    zhCN: `刚更新学校：${common}。`,
    zhHK: `剛更新學校：${common}。`,
  };

  const { emi, logoUrl, website, ...inputFieldsEx } = inputFields; // remove emi, logoUrl, website from inputFields, to prevent mongo conflict
  const unset = {
    ...(typeof emi === 'undefined' && { emi: 1 }),
    ...(!logoUrl && { logoUrl: 1 }),
    ...(!website && { website: 1 }),
  };

  const update: UpdateQuery<SchoolDocument> = {
    ...inputFieldsEx,
    district,
    levels,
    ...(typeof emi === 'boolean' && { emi }),
    ...(logoUrl && { logoUrl }),
    ...(website && { website }),
    ...(Object.keys(unset).length && { $unset: unset }),
  };

  const [school] = await Promise.all([
    School.findByIdAndUpdate(id, update, { fields: select(userRoles), new: true }).lean(),
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/schools/${id}`, 'UPDATE', { args, original }),
    syncToAllSatellites({
      bulkWrite: { schools: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<SchoolDocument> },
      ...((addObject || removeObject) && {
        minio: {
          serverUrl: config.server.minio.serverUrl,
          ...(addObject && { addObjects: [addObject] }),
          ...(removeObject && { removeObjects: [removeObject] }),
        },
      }),
    }),
  ]);
  if (school) return school;
  log('error', `schoolController:update()`, args, userId);
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
