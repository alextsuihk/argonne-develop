/**
 * Controller: Announcements
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';

import type { AnnouncementDocument, Id } from '../models/announcement';
import Announcement, { searchableFields } from '../models/announcement';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import { messageToAdmin } from '../utils/chat';
import { notifySync } from '../utils/notify-sync';
import type { StatusResponse } from './common';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { auth, DELETED, hubModeOnly, isAdmin, paginateSort, searchFilter, select } = common;
const { announcementSchema, idSchema, querySchema } = yupSchema;

/**
 * Create
 */
const create = async (req: Request, args: unknown): Promise<AnnouncementDocument & Id> => {
  const { userId, userLocale, userRoles } = auth(req);
  const {
    announcement: { tenantId, ...fields },
  } = await announcementSchema.validate(args);

  if (!tenantId) hubModeOnly();
  if (tenantId) await Tenant.findByTenantId(tenantId, userId, isAdmin(userRoles));
  if (!isAdmin(userRoles) && !tenantId) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };

  const announcement = new Announcement<Partial<AnnouncementDocument>>({ tenant: tenantId, ...fields });
  const { _id, title, message } = announcement;

  const common = `${title} - ${message} [/announcements/${_id}]`;
  const msg = {
    enUS: `A new announcement is added: ${common}. `,
    zhCN: `刚新增公告：${common}。`,
    zhHK: `剛新增通告：${common}。`,
  };

  await Promise.all([
    announcement.save(),
    messageToAdmin(msg, userId, userLocale, userRoles, [], tenantId ? `TENANT#${tenantId}` : 'ANNOUNCEMENT'),
    DatabaseEvent.log(userId, `/announcements/${_id}`, 'CREATE', { tenant: tenantId, announcement: fields }),
    tenantId
      ? notifySync('CORE', {}, { announcementIds: [_id] })
      : notifySync('ANNOUNCEMENT', { tenantId }, { announcementIds: [_id] }),
  ]);

  return announcement;
};

/**
 * Create (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, { announcement: req.body }) });
  } catch (error) {
    next(error);
  }
};

// (helper) common code for find(), findMany(), findOne()
const findCommon = async (userTenants: string[], isAdmin: boolean, args: unknown, getOne = false) => {
  const { id, query } = getOne
    ? await idSchema.concat(querySchema).validate(args)
    : { ...(await querySchema.validate(args)), id: null };

  return searchFilter<AnnouncementDocument>(
    id ? [] : searchableFields,
    { query },
    {
      ...(id && { _id: id }),
      tenant: { $in: [undefined, ...userTenants] },
      // $or: [{ tenant: { $exists: false } }, { tenant: { $in: userTenants } }],
      ...(!isAdmin && { endAt: { $gte: new Date() } }),
    },
  );
};

/**
 * Find Multiple (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<AnnouncementDocument & Id[]> => {
  const { userRoles, userTenants } = auth(req);
  const filter = await findCommon(userTenants, isAdmin(userRoles), args);

  return Announcement.find(filter, select(userRoles)).lean();
};

/**
 * Find Multiple with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userRoles, userTenants } = auth(req);
    const filter = await findCommon(userTenants, isAdmin(userRoles), { query: req.query });
    const options = paginateSort(req.query, { name: 1 });

    const [total, announcements] = await Promise.all([
      Announcement.countDocuments(filter),
      Announcement.find(filter, select(userRoles), options).lean(),
    ]);

    res.status(200).json({ meta: { total, ...options }, data: announcements });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One by ID
 */
const findOne = async (req: Request, args: unknown): Promise<(AnnouncementDocument & Id) | null> => {
  const { userRoles, userTenants } = auth(req);
  const filter = await findCommon(userTenants, isAdmin(userRoles), args, true);

  return Announcement.findOne(filter, select(userRoles)).lean();
};

/**
 * Find One by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const announcement = await findOne(req, { id: req.params.id });
    announcement ? res.status(200).json({ data: announcement }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete by ID
 */

const remove = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const { userId, userLocale, userRoles, userTenants } = auth(req);
  const { id } = await idSchema.validate(args);

  // for non-admin, check if userId is tenantAdmin
  if (!isAdmin(userRoles)) {
    const original = await Announcement.findOne({
      _id: id,
      tenant: { $in: userTenants },
      deletedAt: { $exists: false },
    }).lean();

    if (!original?.tenant) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR }; // only admin could remove "announcement for all"
    await Tenant.findByTenantId(original.tenant, userId);
  }

  const now = new Date();
  const announcement = await Announcement.findOneAndUpdate(
    isAdmin(userRoles)
      ? { _id: id, deletedAt: { $exists: false } }
      : { _id: id, tenant: { $in: userTenants }, deletedAt: { $exists: false } },
    { $unset: { tenant: 1 }, title: DELETED, message: DELETED, beginAt: now, endAt: now, deletedAt: now },
  ).lean();
  if (!announcement) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const common = `${announcement.title} - ${announcement.message} [/announcements/${id}]`;
  const msg = {
    enUS: `An announcement is removed: ${common}.`,
    zhCN: `刚删除通告：${common}。`,
    zhHK: `剛刪除通告：${common}。`,
  };

  const tenantId = announcement.tenant;
  await Promise.all([
    messageToAdmin(msg, userId, userLocale, userRoles, [], 'ANNOUNCEMENT'),
    DatabaseEvent.log(userId, `/announcements/${id}`, 'DELETE', { announcement }),
    tenantId
      ? notifySync('CORE', {}, { announcementIds: [id] })
      : notifySync('ANNOUNCEMENT', { tenantId }, { announcementIds: [id] }),
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

export default {
  create,
  createNew,
  remove,
  removeById,
  find,
  findMany,
  findOne,
  findOneById,
};
