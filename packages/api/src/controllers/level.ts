/**
 * Controller: Levels
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import DatabaseEvent from '../models/event/database';
import type { LevelDocument } from '../models/level';
import Level, { searchableFields } from '../models/level';
import { messageToAdmin } from '../utils/chat';
import { randomString } from '../utils/helper';
import syncSatellite from '../utils/sync-satellite';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { assertUnreachable, auth, hubModeOnly, DELETED, DELETED_LOCALE, paginateSort, searchFilter, select } = common;
const { levelSchema, idSchema, querySchema, remarkSchema, removeSchema } = yupSchema;

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<LeanDocument<LevelDocument>> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const level = await Level.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();

  if (!level) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/levels/${id}`, 'REMARK', { remark });
  return level;
};

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<LevelDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { level: fields } = await levelSchema.validate(args);

  if (await Level.exists({ code: fields.code.toUpperCase() }))
    throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const level = new Level<Partial<LevelDocument>>(fields);
  const { _id, code, name } = level;

  const common = `${code} (ENG): ${name.enUS}, (繁): ${name.zhHK}, (简): ${name.zhCN} [/levels/${_id}]`;
  const msg = {
    enUS: `A new school level is added: ${common}.`,
    zhCN: `刚新增年级：${common}。`,
    zhHK: `剛新增年級：${common}。`,
  };

  await Promise.all([
    level.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/levels/${_id}`, 'CREATE', { level: fields }),
    syncSatellite({}, { levelIds: [_id.toString()] }),
  ]);

  return level;
};

/**
 * Create New (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { level: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<LevelDocument>[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<LevelDocument>(searchableFields, { query });
  return Level.find(filter, select(req.userRoles)).lean();
};

/**
 * Find Multiple with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<LevelDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, levels] = await Promise.all([
      Level.countDocuments(filter),
      Level.find(filter, select(req.userRoles), options).lean(),
    ]);
    res.status(200).json({ meta: { total, ...options }, data: levels });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<LevelDocument> | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<LevelDocument>(searchableFields, { query }, { _id: id });
  return Level.findOne(filter, select(req.userRoles)).lean();
};

/**
 * Find One by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const level = await findOne(req, { id: req.params.id });
    level ? res.status(200).json({ data: level }) : next({ statusCode: 404 });
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

  const original = await Level.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    {
      $unset: { nextLevel: 1 },
      code: `${DELETED}#${randomString()}`,
      name: DELETED_LOCALE,
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
  ).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `${original.code} (ENG): ${original.name.enUS}, (繁): ${original.name.zhHK}, (简): ${original.name.zhCN} [/levels/${id}]`;
  const msg = {
    enUS: `A school level is removed: ${common}.`,
    zhCN: `刚删除年级：${common}。`,
    zhHK: `剛刪除年級：${common}。`,
  };
  await Promise.all([
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/levels/${id}`, 'DELETE', { remark, original }),
    syncSatellite({}, { levelIds: [id] }),
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
 * Update Level
 */
const update = async (req: Request, args: unknown): Promise<LeanDocument<LevelDocument>> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const {
    id,
    level: { code, ...fields },
  } = await levelSchema.concat(idSchema).validate(args);

  const original = await Level.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (original.code !== code.toUpperCase()) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `${code} (ENG): ${fields.name.enUS}, (繁): ${fields.name.zhHK}, (简): ${fields.name.zhCN} [/levels/${id}]`;
  const msg = {
    enUS: `A school level is updated: ${common}.`,
    zhCN: `刚更新年级：${common}。`,
    zhHK: `剛更新年級：${common}。`,
  };

  const [level] = await Promise.all([
    Level.findByIdAndUpdate(id, fields, { fields: select(userRoles), new: true }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/levels/${id}`, 'UPDATE', { original, update: fields }),
    syncSatellite({}, { levelIds: [id] }),
  ]);

  return level!;
};

/**
 * Update (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, level: req.body }) });
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
  remove,
  removeById,
  find,
  findMany,
  findOne,
  findOneById,
  update,
  updateById,
};
