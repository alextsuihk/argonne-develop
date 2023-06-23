/**
 * Model: Job
 *
 * future pending jobs either
 *  1) run within worker
 *  2) process offline (isolated) Python or Javascript task by runner
 *
 */

import { LOCALE } from '@argonne/common';
import type { Model, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import { redisClient } from '../redis';
import { randomString } from '../utils/helper';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

// type Task = 'bulkUpdate' | 'grade' | 'report' | 'sync';
type Task = 'censor' | 'grade' | 'report' | 'sync';

export type Args = Record<string, string | string[]>;

export interface JobDocument extends BaseDocument {
  status: (typeof LOCALE.DB_TYPE.JOB.STATUS)[number];
  title?: string;
  owners?: string[] | Types.ObjectId[];
  task: Task;
  args: Args;
  priority: number;
  startAfter: Date;
  retry: number;

  startedAt?: Date;
  progress: number;
  completedAt?: Date;
  result?: string; // CSV format
}

interface QueueData {
  title?: string;
  owners?: string[] | Types.ObjectId[];
  task: Task;
  args: Args;
  startAfter?: Date;
  priority?: number;
}

interface JobModel extends Model<JobDocument> {
  queue(data: QueueData): Promise<string>;
}

const { JOB, SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

export const NEW_JOB_CHANNEL = `new-job-${randomString()}`;

const jobSchema = new Schema<JobDocument>(
  {
    ...baseDefinition,

    status: { type: String, default: JOB.STATUS.QUEUED, index: true },
    title: String,
    owners: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    task: String,
    args: Schema.Types.Mixed,
    priority: { type: Number, default: 0 },
    startAfter: { type: Date, default: Date.now, index: true },
    retry: { type: Number, default: 0 },

    startedAt: Date,
    progress: { type: Number, default: 0 },
    completedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.JOB },
    result: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

jobSchema.static('queue', async (data: QueueData): Promise<string> => {
  const { title, owners, task, args, startAfter = new Date(), priority = 0 } = data;

  // TODO: check if task is valid
  const job = await Job.create({ status: JOB.STATUS.QUEUED, title, owners, task, args, startAfter, priority });

  await redisClient.publish(NEW_JOB_CHANNEL, job._id.toString());
  return job._id.toString();
});

jobSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Job = model<JobDocument, JobModel>('Job', jobSchema);
export default Job;
