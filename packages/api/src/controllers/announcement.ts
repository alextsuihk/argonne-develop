/**
 * Controller: Announcements
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import type { AnnouncementDocument, Id } from '../models/announcement';
import Announcement, { searchableFields } from '../models/announcement';
import DatabaseEvent from '../models/event/database';
import Tenant from '../models/tenant';
import { messageToAdmins, startChatGroup } from '../utils/chat';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync, syncToAllSatellites } from '../utils/notify-sync';
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
    announcement: { tenantId, ...inputFields },
  } = await announcementSchema.validate(args);

  if (!tenantId) {
    hubModeOnly();
    if (!isAdmin(userRoles)) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  }
  const tenant = tenantId ? await Tenant.findByTenantId(tenantId, userId) : null; // only tenantAdmin could create tenanted-announcement

  const announcement = new Announcement<Partial<AnnouncementDocument>>({
    ...(tenant && { tenant: tenant._id }),
    ...inputFields,
  });
  const { _id, title, message } = announcement;

  const common = `${title} - ${message} [/announcements/${_id}]`;
  const msg = {
    enUS: `A new announcement is added: ${common}. `,
    zhCN: `刚新增公告：${common}。`,
    zhHK: `剛新增通告：${common}。`,
  };

  const sync = {
    bulkWrite: {
      announcements: [{ insertOne: { document: announcement.toObject() } }] satisfies BulkWrite<AnnouncementDocument>,
    },
  };
  await Promise.all([
    announcement.save(),
    DatabaseEvent.log(userId, `/announcements/${_id}`, 'CREATE', { args }),
    tenant
      ? startChatGroup(
          tenant._id,
          `Announcement ${announcement._id} is created (${message})`,
          tenant.admins,
          userLocale,
          `TENANT#${tenant._id} Announcement`,
        )
      : messageToAdmins(msg, userId, userLocale, true),
    tenant
      ? notifySync(tenant._id, { userIds: tenant.admins, event: 'ANNOUNCEMENT' }, sync) // for tenantAdmins to sync immediately, regular users could pull periodically
      : syncToAllSatellites(sync),
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
  const { userId, userLocale, userRoles } = auth(req);
  const { id } = await idSchema.validate(args);

  const original = await Announcement.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!original) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  if (!original.tenant) hubModeOnly(); // global announcement must be removed in hub-mode

  if (!original.tenant && !isAdmin(userRoles)) throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION }; // only admin could remove "global announcement"

  const tenant = original.tenant ? await Tenant.findByTenantId(original.tenant, userId) : null; // for tenant-specific announcement, check userId is tenantAdmin

  const common = `${original.title} - ${original.message} [/announcements/${id}]`;
  const msg = {
    enUS: `An announcement is removed: ${common}.`,
    zhCN: `刚删除通告：${common}。`,
    zhHK: `剛刪除通告：${common}。`,
  };

  const update: UpdateQuery<AnnouncementDocument> = {
    $unset: { tenant: 1 },
    title: DELETED,
    message: DELETED,
    beginAt: new Date(),
    endAt: new Date(),
    deletedAt: new Date(),
  };

  const sync = {
    bulkWrite: {
      announcements: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<AnnouncementDocument>,
    },
  };
  await Promise.all([
    Announcement.updateOne({ _id: id }, update),
    DatabaseEvent.log(userId, `/announcements/${id}`, 'DELETE', { original }),
    tenant
      ? startChatGroup(
          tenant._id,
          `Announcement ${id} is removed (${original.message})`,
          tenant.admins,
          userLocale,
          `TENANT#${tenant._id} Announcement`,
        )
      : messageToAdmins(msg, userId, userLocale, true),
    tenant
      ? notifySync(tenant._id, { userIds: tenant.admins, event: 'ANNOUNCEMENT' }, sync) // for tenantAdmins to sync immediately, regular users could pull periodically
      : syncToAllSatellites(sync),
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
