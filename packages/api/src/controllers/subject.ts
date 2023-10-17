/**
 * Controller: Subjects
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import DatabaseEvent from '../models/event/database';
import Level from '../models/level';
import type { SubjectDocument } from '../models/subject';
import Subject, { searchableFields } from '../models/subject';
import { messageToAdmins } from '../utils/chat';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { syncToAllSatellites } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { assertUnreachable, auth, DELETED_LOCALE, hubModeOnly, paginateSort, searchFilter, select } = common;
const { idSchema, querySchema, remarkSchema, removeSchema, subjectSchema } = yupSchema;

// (helper) validate levelId
const validateIds = async (levelIds: string[]) => {
  const levels = await Level.find({ _id: { $in: levelIds }, deletedAt: { $exists: false } }).lean();
  if (levels.length !== levelIds.length) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  return { levels: levels.map(lvl => lvl._id) };
};

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<SubjectDocument> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const subject = await Subject.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();

  if (!subject) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/subjects/${id}`, 'REMARK', { args });
  return subject;
};

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<SubjectDocument> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req, 'ADMIN');
  const { subject: inputFields } = await subjectSchema.validate(args);
  const { levels } = await validateIds(inputFields.levels);

  const subject = new Subject<Partial<SubjectDocument>>({ ...inputFields, levels });
  const { _id, name } = subject;

  const common = `(ENG): ${name.enUS}, (繁)：${name.zhHK}, (简)：${name.zhCN}) [/subjects/${_id}]`;
  const msg = {
    enUS: `A new subject is added: ${common}.`,
    zhCN: `刚新增学科：${common}。`,
    zhHK: `剛新增學科：${common}。`,
  };

  await Promise.all([
    subject.save(),
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/subjects/${_id}`, 'CREATE', { args }),
    syncToAllSatellites({
      bulkWrite: { subjects: [{ insertOne: { document: subject } }] satisfies BulkWrite<SubjectDocument> },
    }),
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
const find = async (req: Request, args: unknown): Promise<SubjectDocument[]> => {
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
const findOne = async (req: Request, args: unknown): Promise<SubjectDocument | null> => {
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
  const { userId, userLocale } = auth(req, 'ADMIN');
  const { id, remark } = await removeSchema.validate(args);

  const update: UpdateQuery<SubjectDocument> = { name: DELETED_LOCALE, levels: [], deletedAt: new Date() };
  const original = await Subject.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { ...update, ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
  ).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${original.name.enUS}, (繁): ${original.name.zhHK}, (简): ${original.name.zhCN}) [/subjects/${id}]`;
  const msg = {
    enUS: `A subject is removed: ${common}.`,
    zhCN: `刚删除学科: ${common}。`,
    zhHK: `剛刪除學科: ${common}。`,
  };

  await Promise.all([
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/subjects/${id}`, 'DELETE', { args, original }),
    syncToAllSatellites({
      bulkWrite: { subjects: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<SubjectDocument> },
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
 * Update Subject
 */
const update = async (req: Request, args: unknown): Promise<SubjectDocument> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, subject: inputFields } = await idSchema.concat(subjectSchema).validate(args);

  const [original, { levels }] = await Promise.all([
    Subject.findOne({ _id: id, deletedAt: { $exists: false } }).lean(),
    validateIds(inputFields.levels),
  ]);
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const update: UpdateQuery<SubjectDocument> = { ...inputFields, levels };
  const common = `(ENG): ${update.name.enUS}, (繁): ${update.name.zhHK}, (简): ${update.name.zhCN}) [/subjects/${id}]`;
  const msg = {
    enUS: `A subject is updated: ${common}.`,
    zhCN: `刚更新学科：${common}。`,
    zhHK: `剛更新學科：${common}。`,
  };

  const [subject] = await Promise.all([
    Subject.findByIdAndUpdate(id, update, { fields: select(userRoles), new: true }).lean(),
    messageToAdmins(msg, userId, userLocale, true),
    DatabaseEvent.log(userId, `/subjects/${id}`, 'UPDATE', { args, original }),
    syncToAllSatellites({
      bulkWrite: { subjects: [{ updateOne: { filter: { _id: id }, update } }] },
    }),
  ]);

  if (subject) return subject;
  log('error', `subjectController:update()`, args, userId);
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
