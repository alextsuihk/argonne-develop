/**
 * Job-Runner: Process Job Collection
 *
 * !note: single thread running one job at a time
 */

import { LOCALE } from '@argonne/common';
import { addMilliseconds } from 'date-fns';
import Redis from 'ioredis';
import type { Types } from 'mongoose';

import configLoader from '../config/config-loader';
import Job, { NEW_JOB_CHANNEL } from '../models/job';
import { isTestMode } from '../utils/environment';
import log from '../utils/log';
import { notifySync } from '../utils/notify-sync';
import grade from './grade';
import report from './report';
import sync from './sync';
import censor from './censor';

const { JOB } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

let status: 'off' | 'sleep' | 'running' = 'off';
let sleepTimer: NodeJS.Timeout;
let jobTimeout: NodeJS.Timeout;

const redis = new Redis(config.server.redis.url);
redis.subscribe(NEW_JOB_CHANNEL);
redis.on('message', (channel, jobId: string) => {
  if (channel !== NEW_JOB_CHANNEL) return;

  console.log(`received a new Job request ${jobId}`);

  isTestMode
    ? Job.updateOne(
        { _id: jobId },
        { status: JOB.STATUS.COMPLETED, progress: 100, completedAt: new Date(), result: 'not execute in test mode' },
      )
    : start(jobId);
});

// get next queued job
const getNextJob = async (jobId?: string | Types.ObjectId) =>
  jobId
    ? Job.findByIdAndUpdate(jobId, { status: JOB.STATUS.RUNNING, startedAt: new Date(), progress: 1 }, { new: true })
    : Job.findOneAndUpdate(
        { status: JOB.STATUS.QUEUED, startAfter: { $gte: new Date() }, retry: { $lte: DEFAULTS.JOB.RETRY } },
        { status: JOB.STATUS.RUNNING, startedAt: new Date(), progress: 1 },
        { sort: { priority: -1, startedAfter: 1, retry: 1 }, new: true },
      );

/**
 * Start (or re-schedule) Job Runner
 */
const start = async (jobId?: string | Types.ObjectId): Promise<void> => {
  if (status === 'running') return; // do nothing if another instance is running

  // in case of previous crash, re-queue jobs
  if (status === 'off') await Job.updateMany({ status: JOB.STATUS.RUNNING }, { status: JOB.STATUS.QUEUED });

  status = 'running';
  clearTimeout(sleepTimer);
  let reStartsInMs = DEFAULTS.JOB.SLEEP; // re-start in milliseconds

  let job = await getNextJob(jobId);
  console.log(
    `DEBUG>>>>> Job-Runner status: "${status}", sleepTimer: "${sleepTimer}", jobID: "${job?._id}", (${new Date()})`,
  );

  while (job) {
    const { _id, args, task } = job;
    const jobId = _id.toString();
    try {
      const result = await Promise.race([
        new Promise<never>((_, reject) => {
          jobTimeout = setTimeout(reject, DEFAULTS.JOB.TIMEOUT, 'timeout');
        }),
        task === 'censor'
          ? censor(args)
          : task === 'grade'
          ? grade(args)
          : task === 'report'
          ? report(args)
          : task === 'sync'
          ? sync(args)
          : log('error', 'unknown task', { jobId, task: task }),
      ]);

      await Job.updateOne(
        { _id },
        { status: JOB.STATUS.COMPLETED, progress: 100, completedAt: new Date(), ...(result && { result }) },
      );
    } catch (error) {
      console.log(`jobRunner try-catch error() =>> ${error}`);
      if (error === 'timeout') {
        reStartsInMs = 5000; // re-try in 5 seconds if timeout

        await Promise.all([
          log('warn', `jobId: ${jobId} timeout, retries: ${job.retry} (${job.retry >= DEFAULTS.JOB.RETRY})`),
          await Job.updateOne(
            { _id },
            job.retry >= DEFAULTS.JOB.RETRY
              ? { status: JOB.STATUS.TIMEOUT, completedAt: new Date() }
              : {
                  status: JOB.STATUS.QUEUED,
                  $inc: { retry: 1 },
                  startAfter: addMilliseconds(new Date(), reStartsInMs),
                },
          ),
        ]);
      } else {
        await Promise.all([
          log('error', `jobId: ${jobId}, message: ${error}`),
          await Job.updateOne(
            { _id },
            { status: JOB.STATUS.ERROR, completedAt: new Date(), result: JSON.stringify(error) },
          ),
        ]);
      }
    } finally {
      clearTimeout(jobTimeout);

      const [nextJob] = await Promise.all([
        getNextJob(),
        job.owners?.length && notifySync('JOB', { userIds: job.owners }, {}),
      ]);
      job = nextJob;
    }
  }

  sleepTimer = setTimeout(start, reStartsInMs + 100); // restart once a while
  status = 'sleep';
};

const stop = () => {
  redis.disconnect();
};

export default { start, stop };
