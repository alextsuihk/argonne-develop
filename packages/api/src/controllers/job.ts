/**
 * Controller: Jobs
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';
import type { UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import DatabaseEvent from '../models/event/database';
import type { JobDocument } from '../models/job';
import Job, { searchableFields } from '../models/job';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { JOB } = LOCALE.DB_ENUM;

const { auth, hubModeOnly, paginateSort, searchFilter, select } = common;
const { idSchema, querySchema } = yupSchema;

/**
 * Find Multiple (Apollo)
 */
const find = async (req: Request, args: unknown): Promise<JobDocument[]> => {
  const { userId } = auth(req);
  const { query } = await querySchema.validate(args);

  const filter = searchFilter<JobDocument>(searchableFields, { query }, { owners: userId });
  return Job.find(filter, select()).lean();
};

/**
 * Find Multiple Jobs with queryString (RESTful)
 */
const findMany: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = auth(req);
    const { query } = await querySchema.validate({ query: req.query });

    const filter = searchFilter<JobDocument>(searchableFields, { query }, { owners: userId });
    const options = paginateSort(req.query, { name: 1 });

    const [total, jobs] = await Promise.all([Job.countDocuments(filter), Job.find(filter, select(), options).lean()]);

    res.status(200).json({ meta: { total, ...options }, data: jobs });
  } catch (error) {
    next(error);
  }
};

/**
 * Find One by ID
 */
const findOne = async (req: Request, args: unknown): Promise<JobDocument | null> => {
  const { userId } = auth(req);
  const { id, query } = await idSchema.concat(querySchema).validate(args);

  const filter = searchFilter<JobDocument>(searchableFields, { query }, { _id: id, owners: userId });
  return Job.findOne(filter, select()).lean();
};

/**
 * Find One by ID (RESTful)
 */
const findOneById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    const job = await findOne(req, { id: req.params.id });
    job ? res.status(200).json({ data: job }) : next({ statusCode: 404 });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel by ID
 */
const remove = async (req: Request, args: unknown): Promise<JobDocument> => {
  hubModeOnly();
  const { userId } = auth(req);
  const { id } = await idSchema.validate(args);

  const update: UpdateQuery<JobDocument> = { status: JOB.STATUS.CANCELED, completedAt: new Date() };
  const job = await Job.findOneAndUpdate(
    {
      _id: id,
      status: JOB.STATUS.QUEUED,
      owners: userId,
      task: { $in: ['grade', 'report'] }, // only allow to cancel "grade" | "report" task
      deletedAt: { $exists: false },
    },
    update,
    { fields: select(), new: true },
  ).lean();

  if (!job) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

  const tenantId = job.task === 'grade' ? job.grade?.tenantId : job.task === 'report' ? job.report?.tenantId : null;
  await Promise.all([
    DatabaseEvent.log(userId, `/jobs/${id}`, 'DELETE', { args }),
    notifySync(tenantId || null, job.owners.length ? { userIds: job.owners, event: 'JOB' } : null, {
      bulkWrite: { jobs: [{ updateOne: { filter: { _id: id }, update } }] satisfies BulkWrite<JobDocument> },
    }),
  ]);

  return job;
};

/**
 * Delete by ID (RESTful)
 */
const removeById: RequestHandler<{ id: string }> = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next({ statusCode: 404 });

  try {
    res.status(200).json({ data: await remove(req, { id: req.params.id, ...req.body }) });
  } catch (error) {
    next(error);
  }
};

export default {
  find,
  findMany,
  findOne,
  findOneById,
  remove,
  removeById,
};
