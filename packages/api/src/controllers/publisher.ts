/**
 * Controller: Publishers
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import Book from '../models/book';
import ChatGroup from '../models/chat-group';
import DatabaseEvent from '../models/event/database';
import type { Id, PublisherDocument } from '../models/publisher';
import Publisher, { searchableFields } from '../models/publisher';
import User from '../models/user';
import { messageToAdmin } from '../utils/chat';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { assertUnreachable, auth, DELETED_LOCALE, hubModeOnly, paginateSort, searchFilter, select } = common;
const { idSchema, publisherSchema, querySchema, remarkSchema, removeSchema } = yupSchema;

/**
 * Add Remark
 */
const addRemark = async (req: Request, args: unknown): Promise<PublisherDocument & Id> => {
  hubModeOnly();
  const { userId, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await idSchema.concat(remarkSchema).validate(args);

  const publisher = await Publisher.findByIdAndUpdate(
    id,
    { $push: { remarks: { t: new Date(), u: userId, m: remark } } },
    { fields: select(userRoles), new: true },
  ).lean();
  if (!publisher) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  await DatabaseEvent.log(userId, `/publishers/${id}`, 'REMARK', { remark });
  return publisher;
};

/**
 * Create New Publisher
 */
const create = async (req: Request, args: unknown): Promise<PublisherDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const {
    publisher: { logoUrl, ...fields },
  } = await publisherSchema.validate(args);

  const [adminCount] = await Promise.all([
    User.countDocuments({ _id: { $in: fields.admins } }),
    logoUrl && storage.validateObject(logoUrl, userId),
  ]);

  if (fields.admins.length !== adminCount) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const publisher = new Publisher<Partial<PublisherDocument>>({ ...fields, ...(logoUrl && { logoUrl }) });
  const { _id, name } = publisher;

  const common = `(ENG): ${name.enUS}, (繁): ${name.zhHK}, (简): ${name.zhCN} [/publishers/$_id}]`;
  const msg = {
    enUS: `A new publisher is added: ${common}.`,
    zhCN: `刚新增出版商：${common}。`,
    zhHK: `剛新增出版社：${common}。`,
  };

  await Promise.all([
    publisher.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, publisher.admins, `PUBLISHER#${_id}`),
    DatabaseEvent.log(userId, `/publishers/${_id}`, 'CREATE', { publisher: { ...fields, logoUrl } }),
    notifySync('CORE', {}, { publisherIds: [_id], ...(logoUrl && { minioAddItems: [logoUrl] }) }),
  ]);

  return publisher;
};

/**
 * Create New Publisher (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { publisher: req.body }) });
  } catch (error) {
    next(error);
  }
};

/**
 * Find Multiple Publishers (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<(PublisherDocument & Id)[]> => {
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<PublisherDocument>(searchableFields, { query });
  return Publisher.find(filter, select(req.userRoles)).lean();
};

/**
 * Find Multiple Publishers with queryString (RESTful)

 */

const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<PublisherDocument>(searchableFields, { query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, publishers] = await Promise.all([
      Publisher.countDocuments(filter),
      Publisher.find(filter, select(req.userRoles), options).lean(),
    ]);
    res.status(200).json({ meta: { total, ...options }, data: publishers });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One Publisher by ID
 */
const findOne = async (req: Request, args: unknown): Promise<(PublisherDocument & Id) | null> => {
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<PublisherDocument>(searchableFields, { query }, { _id: id });
  return Publisher.findOne(filter, select(req.userRoles)).lean();
};

/**
 * Find One Publisher by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const publisher = await findOne(req, { id: req.params.id });
    publisher ? res.status(200).json({ data: publisher }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Publisher by ID
 */
const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const { id, remark } = await removeSchema.validate(args);

  const original = await Publisher.findByIdAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    {
      $unset: { logoUrl: 1, website: 1 },
      name: DELETED_LOCALE,
      admins: [],
      phones: [],
      deletedAt: new Date(),
      ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }),
    },
  ).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `(ENG): ${original.name.enUS}, (繁): ${original.name.zhHK}, (简): ${original.name.zhCN} [/publishers/${id}]`;
  const msg = {
    enUS: `A publisher is removed: ${common}.`,
    zhCN: `刚删除出版商：${common}。`,
    zhHK: `剛刪除出版社：${common}。`,
  };

  await Promise.all([
    original.logoUrl && storage.removeObject(original.logoUrl), // delete file in Minio if exists
    messageToAdmin(msg, userId, userLocale, userRoles, [], `PUBLISHER#${id}`),
    DatabaseEvent.log(userId, `/publishers/${id}`, 'DELETE', { remark, original }),
    notifySync('CORE', {}, { publisherIds: [id], ...(original.logoUrl && { minioRemoveItems: [original.logoUrl] }) }),
  ]);

  return { code: MSG_ENUM.COMPLETED };
};

/**
 * Delete Publisher by ID (RESTful)
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
 * Update Publisher
 */
const update = async (req: Request, args: unknown): Promise<PublisherDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale, userRoles } = auth(req, 'ADMIN');
  const {
    id,
    publisher: { logoUrl, ...fields },
  } = await idSchema.concat(publisherSchema).validate(args);

  const [original, adminCount] = await Promise.all([
    Publisher.findOne({ _id: id, deletedAt: { $exists: false } }).lean(),
    User.countDocuments({ _id: { $in: fields.admins } }),
  ]);
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (fields.admins.length !== adminCount) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [books] = await Promise.all([
    Book.find({ publisher: id }).lean(),
    logoUrl && original.logoUrl !== logoUrl && storage.validateObject(logoUrl, userId), // only need to validate NEW logoUrl
    original.logoUrl && original.logoUrl !== logoUrl && storage.removeObject(original.logoUrl), // remove old logoUrl from minio if exists and is different from new logoUrl
  ]);

  const common = `(ENG): ${fields.name.enUS}, (繁): ${fields.name.zhHK}, (简): ${fields.name.zhCN} [/publishers/${id}]`;
  const msg = {
    enUS: `A publisher is updated: ${common}.`,
    zhCN: `刚更新出版商：${common}。`,
    zhHK: `剛更新出版社：${common}。`,
  };

  const [publisher] = await Promise.all([
    Publisher.findByIdAndUpdate(
      id,
      { ...fields, ...(logoUrl ? { logoUrl } : { $unset: { logoUrl: 1 } }) },
      { fields: select(userRoles), new: true },
    ).lean(),
    ChatGroup.updateMany(
      { _id: { $in: books.map(({ _id }) => `BOOK#${_id}`) } },
      { admins: fields.admins, $addToSet: { users: fields.admins } },
    ),
    messageToAdmin(msg, userId, userLocale, userRoles, fields.admins, `PUBLISHER#${id}`),
    DatabaseEvent.log(userId, `/publishers/${id}`, 'UPDATE', { original, update: args }),
    notifySync(
      'CORE',
      {},
      {
        publisherIds: [id],
        ...(logoUrl && original.logoUrl !== logoUrl && { minioAddItems: [logoUrl] }),
        ...(original.logoUrl && original.logoUrl !== logoUrl && { minioRemoveItems: [original.logoUrl] }),
      },
    ),
  ]);
  if (publisher) return publisher;
  log('error', `publisherController:update()`, { id, ...fields }, userId);
  throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };
};

/**
 * Update Publisher (RESTful)
 */
const updateById: RequestHandler<{ id: string; action?: Action }> = async (req, res, next) => {
  const { id, action } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return next({ statusCode: 404 });

  try {
    switch (action) {
      case undefined:
        return res.status(200).json({ data: await update(req, { id, publisher: req.body }) });
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
