/**
 * Model: Job
 *
 * because of "JobDocument.task: Schema.Types.Mixed", we need to union {task: Task}
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import { redisClient } from '../redis';
import { isTestMode } from '../utils/environment';
import type { Id } from './common';
import { baseDefinition } from './common';

export type CensorTask = {
  type: 'censor';
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  userLocale: string;
  parent: `/${'chatGroups' | 'questions'}/${string}`;
  contentId: Types.ObjectId;
};

type GradeTask = { type: 'grade'; tenantId: Types.ObjectId; assignmentId: Types.ObjectId };
type RemoveObjectTask = { type: 'removeObject'; url: string };
type ReportTask = { type: 'report'; file: string; args: unknown[]; tenantId?: Types.ObjectId };
export type Task = CensorTask | GradeTask | RemoveObjectTask | ReportTask;

const { JOB, SYSTEM } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const searchFields: string[] = ['title']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

export const NEW_JOB_CHANNEL = 'JOB';

const jobSchema = new Schema(
  {
    ...baseDefinition,

    status: { type: String, enum: LOCALE.DB_TYPE.JOB.STATUS, default: JOB.STATUS.QUEUED, index: true },
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

jobSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
export type JobDocument = Omit<InferSchemaType<typeof jobSchema>, 'task'> & Id & { task: Task }; // properly define task type
const Job = model('Job', jobSchema);
export default Job;

/**
 * Queue Job
 * static function is too convoluted in this case, as input args are referring to JobDocument
 */
export const queueJob = async (
  args: Task & Partial<Pick<JobDocument, 'owners' | 'priority' | 'startAfter' | 'title'>>,
): Promise<JobDocument> => {
  const { title, owners, startAfter = new Date(), priority = 0, ...task } = args;

  const job = await Job.create({
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
