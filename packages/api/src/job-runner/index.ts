/**
 * Job-Runner: Process Job Collection
 *
 * !note: single thread running one job at a time (not to overload CPU)
 */

import { LOCALE } from '@argonne/common';
import { addMilliseconds } from 'date-fns';
import Redis from 'ioredis';
import type { UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import type { JobDocument } from '../models/job';
import Job, { NEW_JOB_CHANNEL } from '../models/job';
import { SYNC_JOB_CHANNEL } from '../models/sync-job';
import Tenant from '../models/tenant';
import { redisClient } from '../redis';
import log from '../utils/log';
import type { BulkWrite } from '../utils/notify-sync';
import { notifySync } from '../utils/notify-sync';
import storage from '../utils/storage';
import censor from './censor';
import grade from './grade';
import report from './report';
import sync from './sync';

const { JOB } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

/**
 * Execute (or re-schedule) Job Runner
 * note: only run a single instance.
 */
const TIMEOUT_ERR = 'TIMEOUT_ERROR';
let isRunning = false;

const execute = async (jobId?: string): Promise<void> => {
  if (isRunning) return; // only single instance could run
  isRunning = true;

  // get next queued job
  const getNextJob = async (jobId?: string) =>
    Job.findOneAndUpdate(
      { ...(jobId && { _id: jobId }), status: JOB.STATUS.QUEUED, startAfter: { $gte: new Date() } },
      { status: JOB.STATUS.RUNNING, startedAt: new Date(), progress: 1, $inc: { attempt: 1 } }, // increment attempt
      { sort: { priority: -1, startedAfter: 1 }, new: true },
    ).lean();

  let job = await getNextJob(jobId);

  console.log(`DEBUG>>>>> Job-Runner, jobID: "${job?._id}", (${new Date()})`);

  while (job) {
    const { _id, attempt, task, owners } = job;

    // update JobDocument, & notifyAndSync
    const updateNotifySync = async (update: UpdateQuery<JobDocument>) => {
      await Promise.all([
        Job.updateOne({ _id }, update),

        config.mode === 'HUB' &&
          'tenantId' in task &&
          notifySync(task.tenantId || null, owners.length ? { userIds: owners, event: 'JOB' } : null, {
            bulkWrite: { jobs: [{ updateOne: { filter: { _id }, update } }] satisfies BulkWrite<JobDocument> },
          }),
      ]);
    };

    // grading & reporting ONLY support (execute) in hub-mode
    if (['grade', 'report'].includes(task.type) && config.mode === 'SATELLITE') {
      await Job.updateOne({ _id }, { status: JOB.STATUS.IGNORE }); // marked "ignore" and skip execution
    } else {
      let timerId: NodeJS.Timeout | undefined;
      try {
        const result = await Promise.race([
          new Promise<never>((_, reject) => {
            timerId = setTimeout(reject, DEFAULTS.JOB_RUNNER.JOB.TIMEOUT, TIMEOUT_ERR);
          }),
          task.type === 'censor'
            ? censor(task)
            : task.type === 'grade'
            ? grade(task)
            : task.type === 'report'
            ? report(task)
            : task.type === 'removeObject'
            ? (await storage.removeObject(task.url)) || `fail to removeObject(${task.url})`
            : 'unknown task.type',
        ]);
        clearTimeout(timerId); // (just good practice), ok to let it expires later

        await updateNotifySync({
          status: JOB.STATUS.COMPLETED,
          progress: 100,
          completedAt: new Date(),
          result,
        });
      } catch (error) {
        console.log(`jobRunner try-catch error() =>> ${error}`);

        clearTimeout(timerId); // (just good practice), in case error is thrown by censor(), grade(), etc
        await Promise.all([
          error === TIMEOUT_ERR
            ? log('warn', `jobId: ${_id} timeout (${task.type})`, { _id, attempt, error })
            : log('error', `jobId: ${_id} error (${task.type})`, { _id, attempt, error }),

          updateNotifySync(
            error == TIMEOUT_ERR
              ? attempt >= DEFAULTS.JOB_RUNNER.JOB.MAX_ATTEMPTS
                ? { status: JOB.STATUS.TIMEOUT, completedAt: new Date() }
                : { status: JOB.STATUS.QUEUED, startAfter: addMilliseconds(new Date(), DEFAULTS.JOB_RUNNER.INTERVAL) } // re-schedule to later time
              : { status: JOB.STATUS.ERROR, completedAt: new Date(), result: JSON.stringify(error) },
          ),
        ]);
      }
    }

    job = await getNextJob();
  }

  isRunning = false;
};

/**
 * Setup
 *
 */
let subClient: Redis | null = null;
let timer: NodeJS.Timeout | undefined;

const start = async () => {
  // setup redisClient subscriber listener
  subClient = redisClient.duplicate();
  subClient.on('message', (channel, id) => {
    console.log(`received a new SyncJob|Job ${id} (${mongoose.isObjectIdOrHexString(id)}) from channel ${channel}`);

    if (mongoose.isObjectIdOrHexString(id)) {
      switch (channel) {
        case NEW_JOB_CHANNEL:
          return execute(id);
        case SYNC_JOB_CHANNEL:
          return sync(id);
        default:
          break;
      }
    }
  });

  // re-queue previously running jobs (in case where server crashes previously)
  await Job.updateMany({ status: JOB.STATUS.RUNNING }, { status: JOB.STATUS.QUEUED });

  // re-run at an interval
  timer = setInterval(async () => {
    const satelliteTenants = await Tenant.findSatellites(); // tenant docs may get updated, refetch up-to-date docs
    await Promise.all([execute(), ...satelliteTenants.map(async ({ _id }) => sync(_id.toString()))]);
  }, DEFAULTS.JOB_RUNNER.INTERVAL);
};

/**
 * Tear Down
 * disconnect redisClient
 */
const stop = () => {
  subClient?.disconnect();
  clearInterval(timer);
};

export default { start, stop };
