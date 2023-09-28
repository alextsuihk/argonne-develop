/**
 * Controller: Publishers
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose, { UpdateQuery } from 'mongoose';

import configLoader from '../config/config-loader';
import Book from '../models/book';
import ChatGroup from '../models/chat-group';
import DatabaseEvent from '../models/event/database';
import type { Id, PublisherDocument } from '../models/publisher';
import Publisher, { searchableFields } from '../models/publisher';
import User from '../models/user';
import { messageToAdmins } from '../utils/chat';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { syncToAllSatellites } from '../utils/notify-sync';
import storage from '../utils/storage';
import type { StatusResponse } from './common';
import common from './common';

type Action = 'addRemark';

const { MSG_ENUM } = LOCALE;
const { config } = configLoader;
const { assertUnreachable, auth, DELETED_LOCALE, hubModeOnly, paginateSort, searchFilter, select } = common;
const { idSchema, publisherSchema, querySchema, remarkSchema, removeSchema } = yupSchema;

/**
 * (helper) validate user input
 */
const validateInputs = async (userIds: string[]) => {
  const users = await User.find({ _id: { $in: userIds } }, '_id').lean();
  if (userIds.length === users.length) return users.map(u => u._id);

  throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
};

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

  await DatabaseEvent.log(userId, `/publishers/${id}`, 'REMARK', { args });
  return publisher;
};

/**
 * Create New Publisher
 */
const create = async (req: Request, args: unknown): Promise<PublisherDocument & Id> => {
  hubModeOnly();
  const { userId, userLocale } = auth(req, 'ADMIN');
  const {
    publisher: { logoUrl, ...inputFields },
  } = await publisherSchema.validate(args);

  const [admins] = await Promise.all([
    validateInputs(inputFields.admins),
    logoUrl && storage.validateObject(logoUrl, userId),
  ]);

  const publisher = new Publisher<Partial<PublisherDocument>>({ ...inputFields, admins, ...(logoUrl && { logoUrl }) });
  const { _id, name } = publisher;

  const common = `(ENG): ${name.enUS}, (繁): ${name.zhHK}, (简): ${name.zhCN} [/publishers/$_id}]`;
  const msg = {
    enUS: `A new publisher is added: ${common}.`,
    zhCN: `刚新增出版商：${common}。`,
    zhHK: `剛新增出版社：${common}。`,
  };

  await Promise.all([
    publisher.save(),
    messageToAdmins(msg, userId, userLocale, true, publisher.admins, `PUBLISHER#${_id}`),
    DatabaseEvent.log(userId, `/publishers/${_id}`, 'CREATE', { args }),
    syncToAllSatellites({
      bulkWrite: {
        publishers: [{ insertOne: { document: publisher.toObject() } }] satisfies BulkWrite<PublisherDocument>,
      },
      ...(logoUrl && { minio: { serverUrl: config.server.minio.serverUrl, addObjects: [logoUrl] } }),
    }),
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
  const { userId, userLocale } = auth(req, 'ADMIN');
  const { id, remark } = await removeSchema.validate(args);

  const update: UpdateQuery<PublisherDocument> = {
    $unset: { logoUrl: 1, website: 1 },
    name: DELETED_LOCALE,
    admins: [],
    phones: [],
    deletedAt: new Date(),
  };
  const original = await Publisher.findByIdAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { ...update, ...(remark && { $push: { remarks: { t: new Date(), u: userId, m: remark } } }) },
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
    messageToAdmins(msg, userId, userLocale, true, [], `PUBLISHER#${id}`),
    DatabaseEvent.log(userId, `/publishers/${id}`, 'DELETE', { args, original }),
    syncToAllSatellites({
      bulkWrite: {
        publishers: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<PublisherDocument>,
      },
      // ...(original.logoUrl && {
      //   minio: { serverUrl: config.server.minio.serverUrl, removeObjects: [original.logoUrl] },
      // }),
    }),
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
    publisher: { logoUrl, ...inputFields },
  } = await idSchema.concat(publisherSchema).validate(args);

  const [original, admins] = await Promise.all([
    Publisher.findOne({ _id: id, deletedAt: { $exists: false } }).lean(),
    validateInputs(inputFields.admins),
  ]);
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const [books] = await Promise.all([
    Book.find({ publisher: id }).lean(),
    logoUrl && original.logoUrl !== logoUrl && storage.validateObject(logoUrl, userId), // only need to validate NEW logoUrl
    original.logoUrl && original.logoUrl !== logoUrl && storage.removeObject(original.logoUrl), // remove old logoUrl from minio if exists and is different from new logoUrl
  ]);

  const common = `(ENG): ${inputFields.name.enUS}, (繁): ${inputFields.name.zhHK}, (简): ${inputFields.name.zhCN} [/publishers/${id}]`;
  const msg = {
    enUS: `A publisher is updated: ${common}.`,
    zhCN: `刚更新出版商：${common}。`,
    zhHK: `剛更新出版社：${common}。`,
  };

  const update: UpdateQuery<PublisherDocument> = {
    ...inputFields,
    admins,
    ...(logoUrl ? { logoUrl } : { $unset: { logoUrl: 1 } }),
  };
  const [publisher] = await Promise.all([
    Publisher.findByIdAndUpdate(id, update, { fields: select(userRoles), new: true }).lean(),
    ChatGroup.updateMany(
      { _id: { $in: books.map(({ _id }) => `BOOK#${_id}`) } },
      { admins: update.admins, $addToSet: { users: update.admins } },
    ),
    messageToAdmins(msg, userId, userLocale, true, update.admins, `PUBLISHER#${id}`),
    DatabaseEvent.log(userId, `/publishers/${id}`, 'UPDATE', { args, original }),
    syncToAllSatellites({
      bulkWrite: {
        publishers: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<PublisherDocument>,
      },
    }),
  ]);
  if (publisher) return publisher;
  log('error', `publisherController:update()`, args, userId);
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
