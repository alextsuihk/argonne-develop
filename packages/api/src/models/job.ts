/**
 * Model: Job
 *
 *
 */

import { LOCALE } from '@argonne/common';
import { InferSchemaType, model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import { redisClient } from '../redis';
import { isTestMode } from '../utils/environment';
import type { Id } from './common';
import { baseDefinition } from './common';

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
    task: { type: String, enum: ['censor', 'grade', 'removeObject', 'report'], required: true },
    censor: { tenantId: Schema.Types.ObjectId, userLocale: String, parent: String, contentId: Schema.Types.ObjectId },
    grade: { tenantId: Schema.Types.ObjectId, assignmentId: Schema.Types.ObjectId },
    report: { tenantId: Schema.Types.ObjectId, file: String, arg: String }, // arg is JSON.stringify
    removeObject: { url: String },
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
export type JobDocument = InferSchemaType<typeof jobSchema> & Id;

const Job = model('Job', jobSchema);
export default Job;

/**
 * Queue Job
 * static function is too convoluted in this case, as input args are referring to JobDocument
 */
export const queueJob = async (
  args: Partial<Pick<JobDocument, 'owners' | 'priority' | 'startAfter' | 'title'>> &
    (
      | ({ task: 'censor' } & NonNullable<JobDocument['censor']>)
      | ({ task: 'grade' } & NonNullable<JobDocument['grade']>)
      | ({ task: 'report' } & NonNullable<JobDocument['report']>)
      | ({ task: 'removeObject' } & NonNullable<JobDocument['removeObject']>)
    ),
): Promise<JobDocument> => {
  const { title, owners, startAfter = new Date(), priority = 0, task } = args;

  const job = await Job.create({
    status: task === 'grade' && config.mode === 'SATELLITE' ? JOB.STATUS.IGNORE : JOB.STATUS.QUEUED, // ONLY Hub grades homework !
    ...(title && { title }),
    owners,
    task,
    ...(task === 'censor' && {
      censor: { tenantId: args.tenantId, userLocale: args.userLocale, parent: args.parent, contentId: args.contentId },
    }),
    ...(task === 'grade' && { grade: { tenantId: args.tenantId, assignmentId: args.assignmentId } }),
    ...(task === 'report' && { report: { tenantId: args.tenantId, file: args.file, arg: args.arg } }),
    ...(task === 'removeObject' && { removeObject: { url: args.url } }),
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

  job.grade;
  job.censor;
};
