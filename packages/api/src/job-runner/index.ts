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
import log from '../utils/log';
import { notify } from '../utils/messaging';
import grade from './scripts/grade';
import sync from './scripts/sync';

const { JOB } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

let status: 'off' | 'sleep' | 'running' = 'off';
let timer: NodeJS.Timeout;

const redis = new Redis(config.server.redis.url);
redis.subscribe(NEW_JOB_CHANNEL);
redis.on('message', (channel, jobId: string) => {
  if (channel !== NEW_JOB_CHANNEL) return;

  console.log(`received a new Job request ${jobId}`);
  start(jobId);
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

  // application crash before job completion
  if (status === 'off') await Job.updateMany({ status: JOB.STATUS.RUNNING }, { status: JOB.STATUS.INCOMPLETE });

  status = 'running';
  clearTimeout(timer);
  let reStartsInMs = DEFAULTS.JOB.SLEEP; // re-start in milliseconds

  let job = await getNextJob(jobId);
  console.log(`DEBUG>>>>> Job-Runner status: ${status}, timer: ${timer}, jobID: ${job?._id}, (${new Date()})`);

  while (job) {
    try {
      switch (job.task) {
        case 'grade':
          await grade(job);
          break;
        case 'report':
          console.log(`report result ${job._id}`);
          break;
        case 'sync':
          await sync(job);
          break;
        default:
          throw `unknown job.task ${job._id} - ${job.task}`;
      }
    } catch (error) {
      console.log(`jobRunner try-catch error() =>> ${error}`);
      if (error === 'timeout') {
        reStartsInMs = 5000; // re-try in 5 seconds if timeout

        await Promise.all([
          log('warn', `jobId: ${job._id} timeout, retries: ${job.retry} (${job.retry >= DEFAULTS.JOB.RETRY})`),
          job.retry >= DEFAULTS.JOB.RETRY
            ? await Job.findByIdAndUpdate(job, { status: JOB.STATUS.TIMEOUT, completedAt: new Date() }).lean()
            : await Job.findByIdAndUpdate(job, {
                status: JOB.STATUS.QUEUED,
                $inc: { retry: 1 },
                startAfter: addMilliseconds(new Date(), reStartsInMs),
              }).lean(),
        ]);
      } else {
        await Promise.all([
          log('error', `jobId: ${jobId}, message: ${error}`),
          await Job.findByIdAndUpdate(job, {
            status: JOB.STATUS.ERROR,
            completedAt: new Date(),
            result: JSON.stringify(error),
          }).lean(),
        ]);
      }
    } finally {
      const [nextJob] = await Promise.all([
        getNextJob(),
        job.owners?.length && notify(job.owners, 'JOB', { jobIds: [job._id.toString()] }),
      ]);
      job = nextJob;
    }
  }

  timer = setTimeout(start, (reStartsInMs || DEFAULTS.JOB.SLEEP) + 100); // restart once a while
  status = 'sleep';
};

const stop = () => {
  redis.disconnect();
};

export default { start, stop };
