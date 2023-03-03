/**
 * Controller: Tags
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import DatabaseEvent from '../models/event/database';
import type { TagDocument } from '../models/tag';
import Tag, { searchableFields } from '../models/tag';
import { messageToAdmin } from '../utils/chat';
import syncSatellite from '../utils/sync-satellite';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { DEFAULTS } = configLoader;
const { assertUnreachable, auth, authGetUser, DELETED_LOCALE, isAdmin, paginateSort, searchFilter, select } = common;
const { idSchema, querySchema, remarkSchema, removeSchema, tagSchema } = yupSchema;

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<LeanDocument<TagDocument>> => {
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const tag = await Tag.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();
  if (!tag) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/tags/${id}`, 'REMARK', { remark });
  return tag;
};

/**
 * Create New Tag
 */
const create = async (req: Request, args: unknown): Promise<LeanDocument<TagDocument>> => {
  const { userId, userLocale, userRoles } = auth(req);
  const user = await authGetUser(req);
  const { tag: fields } = await tagSchema.validate(args);
  fields.name.enUS = fields.name.enUS.toLowerCase();

  if (!isAdmin(userRoles) && user.creditability < DEFAULTS.CREDITABILITY.CREATE_TAG)
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const tag = new Tag(fields);

  const common = `(ENG): ${tag.name.enUS}, (繁): ${tag.name.zhHK}, (简): ${tag.name.zhCN} [/tags/${tag._id}]`;
  const msg = {
    enUS: `A new tag is added: ${common}.`,
    zhCN: `刚新增标签：${common}。`,
    zhHK: `剛新增標籤：${common}。`,
  };

  await Promise.all([
    tag.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/tags/${tag._id}`, 'CREATE', { tag: fields }),
    syncSatellite({}, { tagIds: [tag._id.toString()] }),
  ]);

  return tag;
};

/**
 * Create New Tag (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { tag: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple Tags (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<LeanDocument<TagDocument>[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<TagDocument>(searchableFields, { query });
  return Tag.find(filter, select(req.userRoles)).lean();
};

/**
 * Find Multiple Tags with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<TagDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, tags] = await Promise.all([
      Tag.countDocuments(filter),
      Tag.find(filter, select(req.userRoles), options).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: tags });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Tag by ID
 */
const findOne = async (req: Request, args: unknown): Promise<LeanDocument<TagDocument> | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<TagDocument>(searchableFields, { query }, { _id: id });
  return Tag.findOne(filter, select(req.userRoles)).lean();
};

/**
 * Find One Tag by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const tag = await findOne(req, { id: req.params.id });
    tag ? res.status(200).json({ data: tag }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Tag by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userLocale, userRoles } = auth(req);
  const user = await authGetUser(req);
  const { id, remark } = await removeSchema.validate(args);

  if (!isAdmin(userRoles) && user.creditability < DEFAULTS.CREDITABILITY.REMOVE_TAG)
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const original = await Tag.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    {
      name: DELETED_LOCALE,
      description: DELETED_LOCALE,
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
  ).lean();

  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${original.name.enUS}, (繁): ${original.name.zhHK}, (简): ${original.name.zhCN} [/tags/${id}]`;
  const msg = {
    enUS: `A tag is removed: ${common}.`,
    zhCN: `刚删除标签：${common}。`,
    zhHK: `剛刪除標籤：${common}。`,
  };

  await Promise.all([
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/tags/${id}`, 'DELETE', { remark, original }),
    syncSatellite({}, { tagIds: [id] }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete Tag by ID (RESTful)
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
 * Update Tag
 */
const update = async (req: Request, args: unknown): Promise<LeanDocument<TagDocument>> => {
  const { userId, userLocale, userRoles } = auth(req);
  const user = await authGetUser(req);
  const { id, tag: fields } = await idSchema.concat(tagSchema).validate(args);
  fields.name.enUS = fields.name.enUS.toLowerCase();

  if (!isAdmin(userRoles) && user.creditability < DEFAULTS.CREDITABILITY.UPDATE_TAG)
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const original = await Tag.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${fields.name.enUS}, (繁): ${fields.name.zhHK}, (简): ${fields.name.zhCN} [/tags/${id}]`;
  const msg = {
    enUS: `A tag is updated: ${common}.`,
    zhCN: `刚更新标签：${common}。`,
    zhHK: `剛更新標籤：${common}。`,
  };

  const [tag] = await Promise.all([
    Tag.findByIdAndUpdate(id, fields, { fields: select(userRoles), new: true }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/tags/${id}`, 'UPDATE', { original, update: fields }),
    syncSatellite({}, { tagIds: [id] }),
  ]);

  return tag!;
};

/**
 * Update Tag (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;

  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, tag: req.body }) });
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