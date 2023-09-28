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
import { isTestMode } from '../utils/environment';
import type { BaseDocument, Id } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export type CensorTask = {
  type: 'censor';
  tenantId: Types.ObjectId;
  userId: string;
  userLocale: string;
  model: 'chat-groups' | 'questions';
  parentId: string;
  contentId: Types.ObjectId;
};

type GradeTask = { type: 'grade'; tenantId: Types.ObjectId; assignmentId: Types.ObjectId };
type RemoveObjectTask = { type: 'removeObject'; url: string };
type ReportTask = { type: 'report'; file: string; args: unknown[]; tenantId?: Types.ObjectId };
export type Task = CensorTask | GradeTask | RemoveObjectTask | ReportTask;

export interface JobDocument extends BaseDocument {
  status: (typeof LOCALE.DB_TYPE.JOB.STATUS)[number];
  title?: string;
  owners: Types.ObjectId[];
  task: Task;
  priority: number;
  startAfter: Date;
  attempt: number;

  startedAt?: Date;
  progress: number;
  completedAt?: Date;
  result?: string; // CSV format
}

type Queue = (
  task: Task & Partial<Pick<JobDocument & Id, 'owners' | 'priority' | 'startAfter' | 'title'>>,
) => Promise<JobDocument & Id>;
interface JobModel extends Model<JobDocument> {
  queue: Queue;
}

const { JOB, SYSTEM } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const searchFields: string[] = ['title']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

export const NEW_JOB_CHANNEL = 'JOB';

const jobSchema = new Schema<JobDocument>(
  {
    ...baseDefinition,

    status: { type: String, default: JOB.STATUS.QUEUED, index: true },
    title: String,
    owners: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    task: Schema.Types.Mixed,
    priority: { type: Number, default: 0 },
    startAfter: { type: Date, default: Date.now, index: true },
    attempt: { type: Number, default: 0 }, // 0: just queued, not yet attempt to execute

    startedAt: Date,
    progress: { type: Number, default: 0 },
    completedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.JOB },
    result: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const queue: Queue = async data => {
  const { title, owners, startAfter = new Date(), priority = 0, ...task } = data;

  const job = await Job.create<Partial<JobDocument>>({
    status: task.type === 'grade' && config.mode === 'SATELLITE' ? JOB.STATUS.IGNORE : JOB.STATUS.QUEUED, // ONLY Hub grades homework !
    ...(title && { title }),
    owners,
    task,
    startAfter,
    priority,
    ...(isTestMode && {
      status: JOB.STATUS.COMPLETED,
      progress: 100,
      completedAt: new Date(),
      result: 'Skip Execution in Test Mode',
    }),
  });

  if (!isTestMode) await redisClient.publish(NEW_JOB_CHANNEL, job._id.toString());
  return job.toObject();
};
jobSchema.static('queue', queue);

jobSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Job = model<JobDocument, JobModel>('Job', jobSchema);
export default Job;
