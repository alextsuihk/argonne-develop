/**
 * Controller: Satellite (initialization & sync)
 *
 * Satellite Initialization Steps
 *  1) satellite React client sends apollo-query SATELLITE_SETUP to satellite server
 *  2) satellite server sends axios.post to hub:/api/satellite/seedRequest
 *  3) hub generates seed.json for satellite to download
 *  4) satellite downloads seed.json, and associated contents, minioObjects
 *  5) satellite send axios.post to hub:/api/satellite/seedComplete
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import axios from 'axios';
import { addSeconds, subDays, subYears } from 'date-fns';
import type { Request, RequestHandler } from 'express';
import type { Model } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import Activity from '../models/activity';
import Announcement from '../models/announcement';
import Assignment from '../models/assignment';
import Book, { BookAssignment, BookDocument } from '../models/book';
import Chat from '../models/chat';
import ChatGroup from '../models/chat-group';
import Classroom from '../models/classroom';
import type { ContentDocument } from '../models/content';
import Content from '../models/content';
import Contribution from '../models/contribution';
import District from '../models/district';
import DatabaseEvent from '../models/event/database';
import Homework from '../models/homework';
import Job, { queueJob } from '../models/job';
import Level from '../models/level';
import Publisher from '../models/publisher';
import Question from '../models/question';
import School from '../models/school';
import SchoolCourse from '../models/school-course';
import Subject from '../models/subject';
import type { SatelliteSeedData, SyncJobDocument } from '../models/sync-job';
import SyncJob from '../models/sync-job';
import Tag from '../models/tag';
import Tenant, { findSatelliteTenantById } from '../models/tenant';
import Token from '../models/token';
import Typography from '../models/typography';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import redisCache from '../redis';
import { dnsLookup, mongoId, randomString, shuffle, sleep } from '../utils/helper';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import storage, { client as minioClient, privateBucket, publicBucket } from '../utils/storage';
import tokenUtil from '../utils/token';
import type { StatusResponse, TokenWithExpireAtResponse } from './common';
import common from './common';
import { signContentIds } from './content';

export type SyncResponse = { code: string; databaseEventId: string; syncResult: unknown; hasSyncError: boolean };
const { MSG_ENUM } = LOCALE;
const { TENANT, USER } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const { auth, hubModeOnly, satelliteModeOnly } = common;
const {
  optionalTimestampSchema,
  satelliteSyncSchema,
  satelliteSeedCompleteSchema,
  tenantIdSchema,
  tokenSchema,
  urlSchema,
  versionSchema,
} = yupSchema;
const { createTokens, signStrings, verifyStrings } = tokenUtil;

const SATELLITE_PREFIX = 'SATELLITE';

/**
 * (helper) cloneContents
 */
const cloneContents = async (contentsToken: string, accessToken: string | null, wait = 100) => {
  try {
    const { data: contents } = await axios.get<ContentDocument[] | unknown>(
      `${DEFAULTS.ARGONNE_URL}/api/contents/${contentsToken}`,
      {
        ...(accessToken && { headers: { Authorization: `Bearer ${accessToken}` } }),
        timeout: DEFAULTS.AXIOS_TIMEOUT,
        responseType: 'json',
      },
    );

    if (
      !Array.isArray(contents) ||
      contents.some(
        c => typeof c._id !== 'string' || !mongoose.isObjectIdOrHexString(c._id) || typeof c.data !== 'string',
      )
    )
      throw new Error('Invalid Content');
    // const contents = fake(Content); // TODO: fake
    const { insertedCount } = await Content.insertMany(contents, { rawResult: true });
    await sleep(wait); // wait (ms) between fetching

    return insertedCount;
  } catch (error) {
    return error instanceof Error ? error.message : 'error';
  }
};

/**
 * (helper) cloneMinioObjects
 */
const cloneMinioObjects = async (serverUrl: string, urls: string[]) =>
  Promise.all(
    urls.map(async url => {
      try {
        const [urlWithoutKey] = url.split('?');

        if (!urlWithoutKey || (!url.startsWith(`/${publicBucket}`) && !url.startsWith(`/${privateBucket}`)))
          return null;

        const [bucket, ...rest] = urlWithoutKey.split('/').slice(1);

        const bucketName = bucket === privateBucket ? privateBucket : bucket === publicBucket ? publicBucket : null;
        if (!bucketName) return null;

        const { data } = await axios.get<Blob>(url, { timeout: DEFAULTS.AXIOS_TIMEOUT, responseType: 'blob' });
        const file = URL.createObjectURL(new Blob([data]));

        await minioClient.putObject(bucketName, rest.join('/'), file);
        return urlWithoutKey;
      } catch (error) {
        return null;
      }
    }),
  );

/**
 * Create Token for satellite (re)initialization
 */
const createToken = async (req: Request, args: unknown): Promise<TokenWithExpireAtResponse> => {
  hubModeOnly();
  auth(req, 'ROOT');
  const { tenantId } = await tenantIdSchema.validate(args);

  const [satelliteToken, tenant] = await Promise.all([
    signStrings([SATELLITE_PREFIX, tenantId], DEFAULTS.SATELLITE.TOKEN_EXPIRES_IN),
    findSatelliteTenantById(tenantId),
  ]);

  if (!tenant) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  return { token: satelliteToken, expireAt: addSeconds(new Date(), DEFAULTS.SATELLITE.TOKEN_EXPIRES_IN) };
};

/**
 * Hub handles the SeedComplete message from satellite [REST-ful ONLY]
 */
const seedComplete: RequestHandler = async (req, res, next) => {
  auth(req); // valid accessToken is required
  try {
    hubModeOnly();
    const { seedingId, tenantId, result, hasError } = await satelliteSeedCompleteSchema.validate(req.body);

    const original = await Tenant.findOneAndUpdate(
      { _id: tenantId, 'seedings.0._id': seedingId }, // must match the top most recent seedings
      {
        $set: {
          satelliteIp: req.ip,
          satelliteStatus: hasError ? TENANT.SATELLITE_STATUS.INIT_FAIL : TENANT.SATELLITE_STATUS.READY,
          'seedings.0.completedAt': new Date(),
          'seedings.0.result': result,
        },
      },
    ).lean();

    if (original && original.satelliteIp !== req.ip)
      await log('warn', `satelliteController:seedComplete() IP changes`, {
        tenantId,
        seedingId,
        ip: req.ip,
        satelliteIp: original.satelliteIp,
      });

    original
      ? res.status(200).json({ code: MSG_ENUM.COMPLETED })
      : next({ statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR });
  } catch (error) {
    next(error);
  }
};

/**
 * Hub handles initialization seed request from satellite [REST-ful ONLY]
 * generates a seed JSON file (along contentTokens) for satellite to download
 *
 * extract all related documents (excluding contents) into a single seed JSON file
 */
const seedRequest: RequestHandler = async (req, res, next) => {
  try {
    hubModeOnly();
    const { ip, ua } = req;
    const { timestamp, token, url, version } = await optionalTimestampSchema
      .concat(tokenSchema)
      .concat(urlSchema)
      .concat(versionSchema)
      .validate(req.body);

    if (!timestamp || Math.abs(timestamp.getTime() - Date.now()) > 3000)
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: `DateTime Out of Sync ${Date.now()}` };

    if (version !== config.buildInfo.version)
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: 'Version Mismatches' };

    const [prefix, tenantId] = await verifyStrings(token);
    const tenant = prefix == SATELLITE_PREFIX && tenantId ? await findSatelliteTenantById(tenantId) : null;
    if (!tenant) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    // don't allow re-sync (within a day of last successful satellite-setup)
    if (tenant.seedings[0]?.completedAt && subDays(Date.now(), 1) < tenant.seedings[0].completedAt)
      throw {
        statusCode: 400,
        code: MSG_ENUM.SATELLITE_ERROR,
        message: `Satellite Already Initialized at ${tenant.seedings[0].completedAt} (${tenant.seedings.length})`,
      };

    const filter = { createdAt: { $gt: subYears(Date.now(), 3) } }; // limit to within 3 years
    const select = '-remarks'; // satellite cannot see remarks
    // ! avoid overstress mongo, fetch collections one-by-one (instead of Promise.all)
    const db = {
      activities: await Activity.find({ $or: [{ tenant }, { tenant: { $exists: false } }] }, select).lean(),
      announcements: await Announcement.find(
        { $or: [{ tenant: tenant._id }, { tenant: { $exists: false } }], beginAt: { $gte: new Date() } },
        select,
      ).lean(),
      bookAssignments: await BookAssignment.find({}, select).lean(),
      books: (await Book.find({}, select).lean()) as BookDocument[], // correct the BookDocument type
      chatGroups: await ChatGroup.find(
        { $or: [{ tenant: tenant._id }, { tenant: { $exists: false } }] },
        select,
      ).lean(),
      classrooms: await Classroom.find({ tenant: tenant._id }, select).lean(),
      contributions: await Contribution.find({}, select).lean(),
      districts: await District.find({}, select).lean(),
      levels: await Level.find({}, select).lean(),
      publishers: await Publisher.find({}, select).lean(),
      questions: await Question.find({ tenant: tenant._id, ...filter }, select).lean(),
      schools: await School.find({ _id: tenant.school }, select).lean(),
      schoolCourses: await SchoolCourse.find({ school: tenant.school }, select).lean(),
      subjects: await Subject.find({}, select).lean(),
      tags: await Tag.find({}, select).lean(),
      typographies: await Typography.find({}, select).lean(),

      users: await User.find({ $or: [{ tenants: tenant }, { status: USER.STATUS.SYSTEM }] }, select).lean(),
    };

    // assignments & homeworks
    const assignments = await Assignment.find(
      { classroom: { $in: db.classrooms.map(c => c._id) }, ...filter },
      select,
    ).lean();
    const homeworks = await Homework.find({
      assignment: { $in: assignments.map(a => a._id), ...filter },
      select,
    }).lean();

    // extract chatIds & contentIds
    const chatIds = [...db.chatGroups.map(c => c.chats), ...db.classrooms.map(c => c.chats)].flat();
    const chats = await Chat.find({ _id: { $in: chatIds } }).lean();

    const contentIds = [
      ...db.bookAssignments.map(ba => ba.content),
      ...chats.map(c => c.contents).flat(),
      ...homeworks.map(h => h.contents).flat(),
      ...db.questions.map(q => q.contents).flat(),
    ];

    // break down large contentIds array into small chunks
    // const chunkedContentIds: string[][] = [];
    // while (contentIds.length) {
    //   chunkedContentIds.push(contentIds.splice(0, 20)); // max 20 contents
    // }
    const chunkedContentIds = Array.from({ length: Math.ceil(contentIds.length / 20) }, (v, i) =>
      contentIds.slice(i * 20, i * 20 + 20),
    );
    const tenantSystem = new User<Partial<UserDocument>>({ name: `Tenant` }).toObject(); // fake tenantSystem for createToken(), no need to save
    const contentsTokens = await Promise.all(chunkedContentIds.map(async ids => signContentIds(tenantSystem._id, ids)));

    // concat additional data
    const apiKey = `${randomString()}${randomString}`.replace('-', '').split('').sort(shuffle).join('');
    const seedData: SatelliteSeedData = {
      ...db,
      tenants: [{ ...tenant, apiKey, seedings: [], satelliteStatus: TENANT.SATELLITE_STATUS.INITIALIZING }], // hide seedings info
      assignments,
      homeworks,
      chats,
      contentsTokens,
      minioServerUrl: config.server.minio.serverUrl,
    };
    const stringifiedData = JSON.stringify(seedData); // convert ObjectId() to string

    const filename = `${prefix}-${tenantId}-${randomString('json')}`;
    const size = `${(stringifiedData.length / 1024 / 1024).toFixed(2)} MB`;
    const startAfter = addSeconds(Date.now(), DEFAULTS.SATELLITE.SEED_EXPIRES_IN);
    const seedingId = mongoId();
    const [{ accessToken }] = await Promise.all([
      createTokens(tenantSystem, { expiresIn: DEFAULTS.SATELLITE.SEED_EXPIRES_IN, ip, ua }), // generate accessToken
      minioClient.putObject(publicBucket, filename, stringifiedData),
      DatabaseEvent.log(null, `/tenants/${tenantId}`, '(re)init satellite', { ip, ua, filename, size }),
      queueJob({ task: 'removeObject', url: `/${publicBucket}/${filename}`, startAfter }), // schedule to remove the seed JSON file
      Tenant.updateOne(
        { _id: tenant._id },
        {
          apiKey,
          satelliteUrl: url,
          satelliteIp: ip,
          satelliteVersion: version,
          satelliteStatus: TENANT.SATELLITE_STATUS.INITIALIZING,
          $push: { seedings: { $each: [{ _id: seedingId, ip, startedAt: new Date() }], $position: 0 } },
        },
      ),
      SyncJob.updateMany({ tenant: tenant._id }, { completedAt: new Date(), result: `clearing by ${seedingId}` }), // clear previous syncJobs of tenant
    ]);
    res.status(200).json({ accessToken, seed: filename, seedingId });
  } catch (error) {
    next(error);
  }
};

/**
 * Satellite handles Setup-Satellite request from React-Client [Apollo ONLY]
 * !note: it takes a while to process: for hub to generate JSON file, and satellite to download seedData
 *
 * only single instance could be executed within 30 mins
 */
const setup = async (req: Request, args: unknown): Promise<StatusResponse> => {
  const SATELLITE_INITIALIZATION_KEY = 'SatelliteInitialization';
  satelliteModeOnly();

  const previousInstance = await redisCache.get<string>(SATELLITE_INITIALIZATION_KEY);
  if (previousInstance)
    throw {
      statusCode: 400,
      code: MSG_ENUM.SATELLITE_ERROR,
      message: `Initialization is in Progress. If fail, please retry after ${new Date(previousInstance)}`,
    };

  const [primaryTenant, { token, url }] = await Promise.all([
    Tenant.findPrimary(),
    tokenSchema.concat(urlSchema).validate(args),
    redisCache.set(SATELLITE_INITIALIZATION_KEY, addSeconds(Date.now(), 30 * 60), 30 * 60),
  ]);
  if (primaryTenant) throw { statusCode: 500, code: MSG_ENUM.SATELLITE_ERROR, message: 'Satellite is Initialized' };

  const { data } = await axios.post<{ accessToken: string; seed: string; seedingId: string } | unknown>(
    `${DEFAULTS.ARGONNE_URL}/api/satellite/seedRequest`,
    { token, url, timestamp: Date.now(), version: config.buildInfo.version },
    { timeout: DEFAULTS.AXIOS_TIMEOUT, responseType: 'json' },
  );

  // trust no one, always check the data type
  if (
    !data ||
    typeof data !== 'object' ||
    !('accessToken' in data) ||
    typeof data.accessToken !== 'string' ||
    !('seed' in data) ||
    typeof data.seed !== 'string' ||
    !('seedingId' in data) ||
    typeof data.seedingId !== 'string'
  )
    throw { statusCode: 500, code: MSG_ENUM.SATELLITE_ERROR, message: 'Invalid Seed Data (1)' };

  const { accessToken, seed, seedingId } = data;
  await DatabaseEvent.log(null, '/tenants', 'setupSatellite', { startedAt: new Date(), seed, seedingId, accessToken });

  // download seed file, Partial<> because we don't trust the data
  const { data: seedData } = await axios.get<Partial<SatelliteSeedData>>(
    `${DEFAULTS.ARGONNE_URL}/${publicBucket}/${seed}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: DEFAULTS.AXIOS_TIMEOUT,
      responseType: 'json',
    },
  );

  if (!seedData || typeof seedData !== 'object' || !('tenants' in seedData) || !Array.isArray(seedData.tenants))
    throw { statusCode: 500, code: MSG_ENUM.SATELLITE_ERROR, message: 'Invalid Seed Data (2)' };

  // TODO: check again >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  const tenant = seedData.tenants.length === 1 ? seedData.tenants[0] : null;
  const tenantId = tenant?._id.toString();
  if (!tenant || !Array.isArray(tenant.flags) || typeof tenantId !== 'string')
    throw { statusCode: 500, code: MSG_ENUM.SATELLITE_ERROR, message: 'Invalid Seed Data (3)' };

  // (helper) insertMany docs, except (the single) tenant
  // be conservative, use optional chaining and check isArray, etc
  const insertManyDocs = async <T>(
    key: Exclude<keyof SatelliteSeedData, 'contents' | 'jobs' | 'contentsTokens' | 'minioServerUrl'>,
    model: Model<T>,
  ) => {
    const docs = seedData && seedData[key];
    if (!docs || !Array.isArray(docs) || !docs.length) return {};

    const { insertedCount } = await model.insertMany(docs, { rawResult: true });
    return { [key]: { insertedCount, hasError: docs.length !== insertedCount } };
  };

  // do not stress mongo connection, insertMany() once at a time
  const dbResult = seedData && {
    // announcements:
    // 'announcements' in seedData &&
    // Array.isArray(seedData.announcements) &&
    // !!seedData.announcements?.length &&
    // { seedData.announcements.length === (await Announcement.insertMany(seedData.announcements, opt)).insertedCount},

    ...(await insertManyDocs('activities', Activity)),
    ...(await insertManyDocs('announcements', Announcement)),
    ...(await insertManyDocs('assignments', Assignment)),
    ...(await insertManyDocs('bookAssignments', BookAssignment)),
    ...(await insertManyDocs('books', Book)),

    ...(await insertManyDocs('chatGroups', ChatGroup)),
    ...(await insertManyDocs('chats', Chat)),
    ...(await insertManyDocs('classrooms', Classroom)),
    // no need to seed contents
    ...(await insertManyDocs('contributions', Classroom)),

    ...(await insertManyDocs('districts', District)),
    ...(await insertManyDocs('homeworks', Homework)),
    // no need to seed jobs
    ...(await insertManyDocs('homeworks', Homework)),
    ...(await insertManyDocs('publishers', Publisher)),

    ...(await insertManyDocs('questions', Question)),
    ...(await insertManyDocs('schoolCourses', SchoolCourse)),
    ...(await insertManyDocs('schools', School)),
    ...(await insertManyDocs('subjects', Subject)),

    ...(await insertManyDocs('tags', Tag)),
    ...(await insertManyDocs('tenants', Tenant)),
    ...(await insertManyDocs('typographies', Typography)),
    ...(await insertManyDocs('users', User)),
  };

  // fetch contents (fetch & store sequentially avoiding stressing hub & local-satellite mongo)
  const contentsTokenResults =
    'contentsTokens' in seedData &&
    Array.isArray(seedData.contentsTokens) &&
    !!seedData.contentsTokens?.length &&
    (await Promise.all(seedData.contentsTokens.map(contentsToken => cloneContents(contentsToken, accessToken))));

  // fetch minio objects
  const minioObjects: string[] = [];
  if (tenant.htmlUrl) minioObjects.push(tenant.htmlUrl);
  if (tenant.logoUrl) minioObjects.push(tenant.logoUrl);
  if ('chatGroups' in seedData && Array.isArray(seedData.chatGroups))
    seedData.chatGroups.forEach(c => c.logoUrl && minioObjects.push(c.logoUrl));
  if ('publishers' in seedData && Array.isArray(seedData.publishers))
    seedData.publishers.forEach(p => p.logoUrl && minioObjects.push(p.logoUrl));
  if ('schools' in seedData && Array.isArray(seedData.schools))
    seedData.schools.forEach(s => s.logoUrl && minioObjects.push(s.logoUrl));
  if ('users' in seedData && Array.isArray(seedData.users))
    seedData.users.forEach(u => u.avatarUrl && minioObjects.push(u.avatarUrl));
  const addMinioObjectsResults =
    'minioServerUrl' in seedData &&
    typeof seedData.minioServerUrl === 'string' &&
    (await cloneMinioObjects(seedData.minioServerUrl, minioObjects));

  const hasError =
    !dbResult ||
    Object.values(dbResult).some(result => result.hasError) ||
    (Array.isArray(contentsTokenResults) ? contentsTokenResults.some(r => typeof r === 'string' || r === 0) : false) ||
    (addMinioObjectsResults && addMinioObjectsResults.some(r => !r));

  // tell hub that satellite initialization is successful
  const result = { hasError, dbResult, contentsTokenResults, addMinioObjectsResults };
  await axios.post(
    `${DEFAULTS.ARGONNE_URL}/api/satellite/seedComplete`,
    { seedingId, tenantId, result: JSON.stringify(result), hasError },
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: DEFAULTS.AXIOS_TIMEOUT },
  );

  await Promise.all([
    Tenant.updateOne(
      { _id: tenantId },
      { satelliteStatus: hasError ? TENANT.SATELLITE_STATUS.INIT_FAIL : TENANT.SATELLITE_STATUS.READY },
    ),
    DatabaseEvent.log(null, '/tenants', 'setupSatellite', {
      completedAt: new Date(),
      seed,
      seedingId,
      tenantId,
      ...result,
    }),
  ]);

  return { code: hasError ? MSG_ENUM.SATELLITE_ERROR : MSG_ENUM.COMPLETED };
};

/**
 * Receive updates (from hub or satellite) [REST-ful ONLY]
 * ! also send socket notifications
 *
 * In case of discrepancy, Hub always wins
 *
 * if satellite receives discrepancy, report error to hub, and hub will push a complete documents for override, and log('error')
 * if hub receives discrepancy, hub will push a create to satellite (along with ALL sub-documents)
 * both case, mark DISCREPANCY in flags[], log is updated
 */
const sync: RequestHandler = async (req, res, next) => {
  try {
    const { apiKey, attempt, syncJobId, stringifiedNotify, stringifiedSync, tenantId, timestamp, version } =
      await satelliteSyncSchema.validate(req.body);

    const tenant = await findSatelliteTenantById(tenantId, 'sync'); // only proceed after SATELLITE_STATUS.READY
    if (!tenant?.satelliteUrl || tenant.apiKey !== apiKey) throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR };

    if (!timestamp || Math.abs(timestamp.getTime() - Date.now()) > 3000) {
      await log('error', `${tenantId}: DateTime Out of Sync`);
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: 'DateTime Out of Sync' };
    }

    const [localMajor, localMinor] = config.buildInfo.version.split('.');
    const [remoteMajor, remoteMinor] = version.split('.');
    if (localMajor !== remoteMajor || localMinor !== remoteMinor) {
      await log('error', `${tenantId}: Outdated Version`);
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: 'Outdated Version' };
    }

    if (config.mode === 'HUB' && req.ip !== (await dnsLookup(tenant.satelliteUrl)))
      throw { statusCode: 400, code: MSG_ENUM.SATELLITE_ERROR, message: 'Satellite DNS IP conflict' };

    if (config.mode === 'HUB' && req.ip !== tenant.satelliteIp)
      await Promise.all([
        log('warn', `satelliteController:sync() IP changes`, { tenantId, ip: req.ip, satelliteIp: tenant.satelliteIp }),
        Tenant.updateOne({ _id: tenant._id }, { satelliteIp: req.ip }),
      ]);

    // Part 1: sync database
    const sync = JSON.parse(stringifiedSync) as NonNullable<SyncJobDocument['sync']>;

    // (helper) common code for bulkWrite, <T> is automatically determined by model
    // return: null for no error
    const bulkWrite = async <T>(
      key: keyof NonNullable<NonNullable<SyncJobDocument['sync']>['bulkWrite']>,
      model: Model<T>,
    ) => {
      const bulkWriteOps = sync?.bulkWrite && sync.bulkWrite[key];
      if (!bulkWriteOps || !bulkWriteOps.length) {
        await log('error', 'satelliteController:sync()', bulkWriteOps);
        return null;
      }

      const results = await Promise.all(
        bulkWriteOps.map(async bulkWrite => {
          if ('insertMany' in bulkWrite) {
            const { documents } = bulkWrite.insertMany;
            const { insertedIds } = await model.insertMany(documents, { rawResult: true });
            return Object.keys(insertedIds).length === documents.length ? { ok: true } : { insertedIds, documents };
          } else if ('insertOne' in bulkWrite) {
            const { document } = bulkWrite.insertOne;
            const { insertedIds } = await model.insertMany(document, { rawResult: true });
            return Object.keys(insertedIds).length ? { ok: true } : { insertedIds, document };
          } else if ('replaceOne' in bulkWrite) {
            const { filter, replacement } = bulkWrite.replaceOne;
            const { ok } = await model.findOneAndReplace(filter, replacement, { includeResultMetadata: true });
            return ok ? { ok: true } : bulkWrite.replaceOne;
          } else if ('updateMany' in bulkWrite) {
            const { filter, update, upsert } = bulkWrite.updateMany;
            const { acknowledged } = await model.updateMany(filter, update, { includeResultMetadata: true, upsert });
            return acknowledged ? { ok: true } : bulkWrite.updateMany;
          } else if ('updateOne' in bulkWrite) {
            const { filter, update, upsert } = bulkWrite.updateOne;
            const { acknowledged } = await model.updateMany(filter, update, { includeResultMetadata: true, upsert });
            return acknowledged ? { ok: true } : bulkWrite.updateOne;
          } else {
            return { reason: 'unknown action' };
          }
        }),
      );

      return { hasError: results.some(result => !('ok' in result)), results };
    };

    const satelliteOnly = () => config.mode === 'SATELLITE' || null;

    const bulkWriteResult = sync?.bulkWrite && {
      ...(await bulkWrite('activities', Activity)),
      ...(await bulkWrite('announcements', Announcement)),
      ...(await bulkWrite('assignments', Assignment)),
      ...(satelliteOnly() && (await bulkWrite('bookAssignments', BookAssignment))),
      ...(satelliteOnly() && (await bulkWrite('books', Book))),

      ...(await bulkWrite('chatGroups', ChatGroup)),
      ...(await bulkWrite('classrooms', Classroom)),
      ...(await bulkWrite('chats', Chat)),
      ...(await bulkWrite('contents', Content)),
      ...(satelliteOnly() && (await bulkWrite('contributions', Contribution))),

      ...(satelliteOnly() && (await bulkWrite('districts', District))),
      ...(await bulkWrite('homeworks', Homework)),
      ...(await bulkWrite('jobs', Job)),
      ...(satelliteOnly() && (await bulkWrite('levels', Level))),
      ...(satelliteOnly() && (await bulkWrite('publishers', Publisher))),

      ...(await bulkWrite('questions', Question)),
      ...(await bulkWrite('schoolCourses', SchoolCourse)),
      ...(satelliteOnly() && (await bulkWrite('schools', School))),
      ...(satelliteOnly() && (await bulkWrite('subjects', Subject))),
      ...(satelliteOnly() && (await bulkWrite('tags', Tag))),

      ...(satelliteOnly() && (await bulkWrite('tenants', Tenant))),
      ...(satelliteOnly() && (await bulkWrite('typographies', Typography))),
      ...(await bulkWrite('users', User)),
    };

    const contentsTokenResult = sync?.contentsToken && (await cloneContents(sync.contentsToken, null));

    const addMinioObjectsResults =
      !!sync?.minio?.serverUrl &&
      Array.isArray(sync?.minio?.addObjects) &&
      !!sync?.minio?.addObjects?.length &&
      (await cloneMinioObjects(sync.minio.serverUrl, sync.minio.addObjects));

    const removeMinioObjectsResults =
      Array.isArray(sync?.minio?.removeObjects) &&
      !!sync?.minio?.removeObjects?.length &&
      (await Promise.all(sync.minio.removeObjects.map(async url => storage.removeObject(url))));

    const extraResult = sync?.extra && {
      ...(sync?.extra?.revokeAllTokensByUserId && {
        revokeAllTokensByUserId: (await Token.deleteMany({ user: sync.extra.revokeAllTokensByUserId })).deletedCount,
      }),
    };

    const hasSyncError =
      !bulkWriteResult ||
      bulkWriteResult.hasError ||
      typeof contentsTokenResult === 'string' ||
      (typeof contentsTokenResult === 'number' && !contentsTokenResult) ||
      (addMinioObjectsResults && addMinioObjectsResults.some(r => !r)) ||
      (removeMinioObjectsResults && removeMinioObjectsResults.some(r => !r));
    const syncResult = {
      bulkWriteResult,
      contentsTokenResult,
      addMinioObjectsResults,
      removeMinioObjectsResults,
      extraResult,
    };
    const databaseEvent = await DatabaseEvent.log(null, `/satellites`, 'sync', {
      attempt,
      sync,
      syncResult,
      syncJobId,
    });

    // Part 2: send notification (after updating database)
    const parsed = JSON.parse(stringifiedNotify) as SyncJobDocument['notify'] | unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'userIds' in parsed &&
      Array.isArray(parsed.userIds) &&
      parsed.userIds.every(userId => typeof userId === 'string') &&
      'event' in parsed &&
      typeof parsed.event === 'string' &&
      ('msg' in parsed ? typeof parsed.msg === 'string' : true)
    )
      await notifySync(null, JSON.parse(stringifiedNotify) as SyncJobDocument['notify'], null); // notify without sync

    res.status(200).json({
      code: MSG_ENUM.COMPLETED,
      databaseEventId: databaseEvent._id.toString(),
      syncResult,
      hasSyncError,
    } satisfies SyncResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * Hub pushes updated config to satellite
 */
const updateConfig: RequestHandler = async (req, res, next) => {
  satelliteModeOnly();

  // TODO
};

export default { createToken, seedRequest, seedComplete, setup, sync, updateConfig };
