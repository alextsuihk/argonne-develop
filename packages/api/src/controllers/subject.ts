/**
 * Controller: Subjects
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import type { Id, SubjectDocument } from '../models/subject';
import Subject, { searchableFields } from '../models/subject';
import { messageToAdmin } from '../utils/chat';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { assertUnreachable, auth, DELETED_LOCALE, hubModeOnly, paginateSort, searchFilter, select } = common;
const { idSchema, querySchema, remarkSchema, removeSchema, subjectSchema } = yupSchema;

const validateLevel = async (levels: string[]): Promise<void> => {
  const levelCount = await Level.countDocuments({ _id: { $in: levels } });
  if (levels.length !== levelCount) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
};

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<SubjectDocument & Id> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const subject = await Subject.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();

  if (!subject) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/subjects/${id}`, 'REMARK', { remark });
  return subject;
};

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<SubjectDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { subject: fields } = await subjectSchema.validate(args);
  await validateLevel(fields.levels);

  const subject = new Subject<Partial<SubjectDocument>>(fields);
  const { _id, name } = subject;

  const common = `(ENG): ${name.enUS}, (繁)：${name.zhHK}, (简)：${name.zhCN}) [/subjects/${_id}]`;
  const msg = {
    enUS: `A new subject is added: ${common}.`,
    zhCN: `刚新增学科：${common}。`,
    zhHK: `剛新增學科：${common}。`,
  };

  await Promise.all([
    subject.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/subjects/${_id}`, 'CREATE', { subject: fields }),
    notifySync('CORE', {}, { subjectIds: [_id] }),
  ]);

  return subject;
};

/**
 * Create (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { subject: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<(SubjectDocument & Id)[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<SubjectDocument>(searchableFields, { query });
  return Subject.find(filter, select(req.userRoles)).lean();
};

/**
 * Find Multiple with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<SubjectDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, subjects] = await Promise.all([
      Subject.countDocuments(filter),
      Subject.find(filter, select(req.userRoles), options).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: subjects });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One by ID
 */
const findOne = async (req: Request, args: unknown): Promise<(SubjectDocument & Id) | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<SubjectDocument>(searchableFields, { query }, { _id: id });
  return Subject.findOne(filter, select(req.userRoles)).lean();
};

/**
 * Find One by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const subject = await findOne(req, { id: req.params.id });
    subject ? res.status(200).json({ data: subject }) : next({ statusCode: 404 });
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

  const original = await Subject.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    {
      name: DELETED_LOCALE,
      levels: [],
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
  ).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${original.name.enUS}, (繁): ${original.name.zhHK}, (简): ${original.name.zhCN}) [/subjects/${id}]`;
  const msg = {
    enUS: `A subject is removed: ${common}.`,
    zhCN: `刚删除学科: ${common}。`,
    zhHK: `剛刪除學科: ${common}。`,
  };

  await Promise.all([
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/subjects/${id}`, 'DELETE', { remark, original }),
    notifySync('CORE', {}, { subjectIds: [id] }),
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
 * Update Subject
 */
const update = async (req: Request, args: unknown): Promise<SubjectDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, subject: fields } = await idSchema.concat(subjectSchema).validate(args);

  const original = await Promise.all([
    Subject.findOne({ _id: id, deletedAt: { $exists: false } }).lean(),
    validateLevel(fields.levels),
  ]);
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${fields.name.enUS}, (繁): ${fields.name.zhHK}, (简): ${fields.name.zhCN}) [/subjects/${id}]`;
  const msg = {
    enUS: `A subject is updated: ${common}.`,
    zhCN: `刚更新学科：${common}。`,
    zhHK: `剛更新學科：${common}。`,
  };

  const [subject] = await Promise.all([
    Subject.findByIdAndUpdate(id, fields, { fields: select(userRoles), new: true }).lean(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'CORE'),
    DatabaseEvent.log(userId, `/subjects/${id}`, 'UPDATE', { original, update: fields }),
    notifySync('CORE', {}, { subjectIds: [id] }),
  ]);
  if (subject) return subject;
  log('error', `subjectController:update()`, { id, ...fields }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Subject (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, subject: req.body }) });
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
