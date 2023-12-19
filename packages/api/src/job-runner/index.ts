/**
 * Job-Runner: Process Job Collection
 *
 * !note:
 * 1) single instance even with cluster of multiple express instances
 * 2) single thread running one job at a time (not to overload CPU)
 */

import { LOCALE } from '@argonne/common';
import { addMilliseconds } from 'date-fns';
import Redis from 'ioredis';
import type { UpdateQuery } from 'mongoose';
import mongoose from 'mongoose';
import { io } from 'socket.io-client';

import configLoader from '../config/config-loader';
import type { JobDocument } from '../models/job';
import Job, { NEW_JOB_CHANNEL } from '../models/job';
import { SYNC_JOB_CHANNEL } from '../models/sync-job';
import Tenant, { findSatelliteTenants } from '../models/tenant';
import { redisClient } from '../redis';
import { sleep } from '../utils/helper';
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
 * In Satellite Mode, try to connect to Hub
 */
const satelliteSocket = config.mode === 'SATELLITE' ? io(DEFAULTS.ARGONNE_URL) : null;
if (satelliteSocket) {
  let connected = false;

  (async () => {
    while (!connected) {
      const tenant = await Tenant.findPrimary();
      if (tenant && tenant.apiKey) {
        satelliteSocket.emit('JOIN_SATELLITE', { tenant: tenant._id.toString(), apiKey: tenant.apiKey });
        connected = true;
      }

      await sleep(DEFAULTS.JOB_RUNNER.INTERVAL); // wait for tenant update (with valid apiKey)
    }
  })();
}

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

  // update JobDocument, & notifyAndSync
  const updateNotifySync = async (job: JobDocument, update: UpdateQuery<JobDocument>) => {
    // ony need to sync "grade" & "report" tasks
    const tenantId = job.task === 'grade' ? job.grade?.tenantId : job.task === 'report' ? job.report?.tenantId : null;

    await Promise.all([
      Job.updateOne({ _id: job._id }, update),
      config.mode === 'HUB' &&
        notifySync(tenantId || null, job.owners.length ? { userIds: job.owners, event: 'JOB' } : null, {
          bulkWrite: { jobs: [{ updateOne: { filter: { _id: job._id }, update } }] satisfies BulkWrite<JobDocument> },
        }),
    ]);
  };

  while (job) {
    // grading & reporting ONLY support (execute) in hub-mode
    if (['grade', 'report'].includes(job.task) && config.mode === 'SATELLITE') {
      await Job.updateOne({ _id: job._id }, { status: JOB.STATUS.IGNORE }); // marked "ignore" and skip execution
    } else {
      let timerId: NodeJS.Timeout | undefined;
      try {
        const result = await Promise.race([
          new Promise<never>((_, reject) => {
            timerId = setTimeout(reject, DEFAULTS.JOB_RUNNER.JOB.TIMEOUT, TIMEOUT_ERR);
          }),
          job.task === 'censor' && job.censor
            ? censor(job.censor)
            : job.task === 'grade' && configLoader.config.mode === 'HUB' && job.grade
              ? grade(job.grade)
              : job.task === 'report' && configLoader.config.mode === 'HUB' && job.report
                ? report(job.report)
                : job.task === 'removeObject' && job.removeObject?.url
                  ? (await storage.removeObject(job.removeObject.url)) ||
                    `fail to removeObject(${job.removeObject.url})`
                  : 'unable to process',
        ]);
        clearTimeout(timerId); // (just good practice), ok to let it expires later

        await updateNotifySync(job, {
          status: JOB.STATUS.COMPLETED,
          progress: 100,
          completedAt: new Date(),
          result,
        });
      } catch (error) {
        console.log(`jobRunner try-catch error() =>> ${error}`);

        clearTimeout(timerId); // (just good practice), in case error is thrown by censor(), grade(), etc
        const { _id, task, attempt } = job;
        await Promise.all([
          error === TIMEOUT_ERR
            ? log('warn', `jobId: ${_id} timeout (${task})`, { _id: _id, attempt, error })
            : log('error', `jobId: ${_id} error (${task})`, { _id: _id, attempt, error }),

          updateNotifySync(
            job,
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
    const satelliteTenants = await findSatelliteTenants('sync'); // tenant docs may get updated, refetch up-to-date docs
    await Promise.all([execute(), ...satelliteTenants.map(async ({ _id }) => sync(_id.toString()))]);
  }, DEFAULTS.JOB_RUNNER.INTERVAL);
};

/**
 * Tear Down
 * disconnect redisClient
 */

const stop = () => {
  satelliteSocket?.disconnect();
  subClient?.disconnect();
  clearInterval(timer);
};

export default { start, stop };
