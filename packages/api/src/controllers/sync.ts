/**
 * Controller: Sync (bi-directional sync between hub & satellite)
 *
 * Note: ONLY need to support restful API
 *
 */

import type { DocumentSync } from '@argonne/common';
import { LOCALE, yupSchema } from '@argonne/common';
import { addSeconds, subDays } from 'date-fns';
import type { RequestHandler } from 'express';
import type { LeanDocument } from 'mongoose';

import configLoader from '../config/config-loader';
import type { AnnouncementDocument } from '../models/announcement';
import Announcement from '../models/announcement';
import type { BookDocument } from '../models/book';
import Book from '../models/book';
import Chat from '../models/chat';
import ChatGroup from '../models/chat-group';
import Content from '../models/content';
import District from '../models/district';
import DatabaseEvent from '../models/event/database';
import Job from '../models/job';
import Level from '../models/level';
import Publisher from '../models/publisher';
import School from '../models/school';
import Subject from '../models/subject';
import Tag from '../models/tag';
import Tenant from '../models/tenant';
import Typography from '../models/typography';
import User from '../models/user';
import { dnsLookup, idsToString } from '../utils/helper';
import log from '../utils/log';
import { client as minioClient } from '../utils/storage';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { config } = configLoader;

const { hubModeOnly } = common;
const { apiKeySchema, optionalTimestampSchema, versionSchema } = yupSchema;

/**
 * Satellite requesting Hub to (re)initialize satellite (RESTful only)
 */
const create: RequestHandler = async (req, res, next) => {
  hubModeOnly();

  try {
    const { apiKey, timestamp, version } = await apiKeySchema
      .concat(optionalTimestampSchema)
      .concat(versionSchema)
      .validate(req.body);

    if (!timestamp || Math.abs(timestamp.getTime() - Date.now()) > 3000)
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: `DateTime Out of Sync ${Date.now()}` };

    if (version !== config.buildInfo.version)
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: 'Outdated Version' };

    // accept verified (lower-cased) & unverified email (upper-cased)
    const tenant = await Tenant.findOne({ apiKey, deletedAt: { $exists: false } }).lean();
    if (!tenant) throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR };

    // don't allow re-sync (after 1 day after synced)
    if (tenant.lastSyncedAt && subDays(tenant.lastSyncedAt, 1) > new Date())
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: 'Satellite Already Initialized' };

    let multiplier = 0;
    const syncJob = async (doc: DocumentSync) =>
      Job.queue({
        task: 'sync',
        args: { tenantId: tenant._id.toString(), ...doc },
        startAfter: addSeconds(Date.now(), 5 * multiplier++), // each job will be delay by additional 5 seconds
        priority: 10,
      });

    // TODO: add more document models, refer to packages\common\src\index.ts
    const [
      tutorTenant,
      announcements,
      books,
      chatGroups,
      districts,
      levels,
      publishers,
      schools,
      subjects,
      tags,
      typographies,
      users,
      { alexId },
    ] = await Promise.all([
      Tenant.findTutor(),
      Announcement.find({ tenant, beginAt: { $gte: new Date() } }).lean(),
      Book.find().lean(),
      ChatGroup.find({ $or: [{ tenant }, { tenant: { $exists: false } }] }).lean(),
      District.find().lean(),
      Level.find().lean(),
      Publisher.find().lean(),
      School.find().lean(),
      Subject.find().lean(),
      Tag.find().lean(),
      Typography.find().lean(),
      User.find({ tenants: tenant }).lean(),
      User.findSystemAccountIds(),
      DatabaseEvent.log(null, `/tenants/${tenant._id}`, 'request to (re)init satellite', { apiKey }),
    ]);

    const [chats] = await Promise.all([
      Chat.find({ _id: { $in: chatGroups.map(chatGroup => idsToString(chatGroup.chats)).flat() } }).lean(),
    ]);

    const [contents] = await Promise.all([
      Content.find({ _id: { $in: chats.map(chat => idsToString(chat.contents)).flat() } }).lean(),
    ]);

    await Promise.all([
      DatabaseEvent.log(null, `/tenants/${tenant._id}`, 'request to (re)init satellite', { apiKey }),
      announcements.length && syncJob({ announcementIds: idsToString(announcements) }),
      books.length && syncJob({ bookIds: idsToString(books) }),

      chatGroups.length &&
        syncJob({
          chatGroupIds: idsToString(chatGroups),
          chatIds: idsToString(chats),
          contentIds: idsToString(contents),
        }),

      districts.length && syncJob({ districtIds: idsToString(districts) }),
      levels.length && syncJob({ levelIds: idsToString(levels) }),
      publishers.length && syncJob({ publisherIds: idsToString(publishers) }),

      schools.length && syncJob({ schoolIds: idsToString(schools) }),

      subjects.length && syncJob({ subjectIds: idsToString(subjects) }),
      tags.length && syncJob({ tagIds: idsToString(tags) }),
      typographies.length && syncJob({ typographyIds: idsToString(typographies) }),
      users.length && syncJob({ userIds: idsToString(users) }),
      syncJob({ userIds: [alexId] }),
      syncJob({ tenantIds: [tutorTenant._id.toString()] }), // last item to send sync update
    ]);

    res.status(200).json({ code: MSG_ENUM.COMPLETED, tenant });
  } catch (error) {
    next(error);
  }
};

/**
 * Receive updates (from satellite or hub)
 * ! also send socket notifications
 */
const update: RequestHandler = async (req, res, next) => {
  try {
    const { apiKey, timestamp, version } = await apiKeySchema
      .concat(optionalTimestampSchema)
      .concat(versionSchema)
      .validate(req.body);

    const tenant = await Tenant.findOne({ apiKey, deletedAt: { $exists: false } }).lean();
    if (!tenant?.satelliteUrl) throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR };

    if (req.ip !== (await dnsLookup(tenant.satelliteUrl))) throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR };

    if (!timestamp || Math.abs(timestamp.getTime() - Date.now()) > 3000) {
      log('error', `${tenant._id}: DateTime Out of Sync`);
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: 'DateTime Out of Sync' };
    }

    const [localMajor, localMinor] = config.buildInfo.version;
    const [remoteMajor, remoteMinor] = version;
    if (localMajor !== remoteMajor || localMinor !== remoteMinor) {
      log('error', `${tenant._id}: Outdated Version`);
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: 'Outdated Version' };
    }

    // pull new minio files
    const minioAddItems = req.body.minioAddItems as string[] | undefined;
    const addMinioObjectPromises = minioAddItems
      ? minioAddItems.map(url => {
          console.log(`download the file ....... ${url}`);
        })
      : [];

    const minioRemoveItems = req.body.minioRemoveItems as string[] | undefined;
    // const removeObjectPromises = minioRemoveItems
    //   ? minioRemoveItems.map(url => {
    //       const [, bucketName, ...rest] = url.split('?')[0]?.split('/') ?? [];
    //       console.log('TODO: let remove the objects in minio ', bucketName, rest.join('/'));
    //       minioClient.removeObject(bucketName, rest.join('/'));
    //     })
    //   : [];
    // TODO

    // TODO: refer to packages\common\src\index.ts
    const announcements = req.body.announcements as LeanDocument<AnnouncementDocument>[] | undefined;
    const announcementUpdates = announcements
      ? announcements.map(async announcement =>
          Announcement.findByIdAndUpdate(
            { _id: announcement._id, updatedAt: { $lt: announcement.updatedAt } },
            announcement,
            { upsert: true },
          ).lean(),
        )
      : [];

    const books = req.body.books as LeanDocument<BookDocument>[] | undefined;
    const bookUpdates = books
      ? books.map(async book =>
          Book.findByIdAndUpdate({ _id: book._id, updatedAt: { $lt: book.updatedAt } }, book, { upsert: true }).lean(),
        )
      : [];

    // TODO: other documents

    // TODO
    // await Promise.all([...addMinioObjectPromises, ...removeObjectPromises, ...announcementUpdates, ...bookUpdates]);
    await Promise.all([...addMinioObjectPromises, ...announcementUpdates, ...bookUpdates]);

    res.status(200).json({ code: MSG_ENUM.COMPLETED });
  } catch (error) {
    next(error);
  }
};

export default { create, update };
