// TODO: copy to index2

/**
 * Job-Runner: Process Job Collection
 *
 * !note: single thread running one job at a time
 *
 * script result should be array (sheet) of array (row-column) of object (Excel workbook)
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { LOCALE } from '@argonne/common';
import axios from 'axios';
import { addMilliseconds } from 'date-fns';
import Redis from 'ioredis';
import type { Types } from 'mongoose';
import { PythonShell } from 'python-shell';
import { Worker } from 'worker_threads';

import configLoader from '../config/config-loader';
import type { JobDocument } from '../models/job';
import Job, { NEW_JOB_CHANNEL } from '../models/job';
import Script from '../models/script-EOL';
import { randomString } from '../utils/helper';
import log from '../utils/log';
import { notify } from '../utils/messaging';
import { client as minioClient, privateBucket } from '../utils/storage';
import questionDispatch from './scripts/question-dispatch';
import sync from './scripts/sync';

const { JOB } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;
const mongoDbUrl = config.server.mongo.url;

// const POOL_SIZE = 4;

// const workers = {
//   worker: Worker
// }[];

const worker = new Worker(`https://${DEFAULTS.ARGONNE_URL}/s3-pub/script-todo.js`, {
  workerData: { taskId: 'xxx' },
  argv: [],
});

let status: 'off' | 'sleep' | 'running' = 'off';
let timer: NodeJS.Timeout;

const redis = new Redis(config.server.redis.url);
redis.subscribe(NEW_JOB_CHANNEL);
redis.on('message', (channel, jobId: string) => {
  if (channel !== NEW_JOB_CHANNEL) return;

  console.log(`received a new Job request ${jobId}`);
  start(jobId);
});

// download & run python or javascript
const downloadAndRun = async (job: JobDocument, scriptUrl: string, mongoDbUrl?: string, outputUrl?: string) => {
  const ext = scriptUrl.slice(-2);
  const scriptPath = path.join(__dirname, 'scripts', randomString(ext));

  try {
    // const writer = fs.createWriteStream(scriptPath);

    // const response = await axios.get(scriptUrl, { responseType: 'stream' });
    // response.data.pipe(writer);
    // await new Promise((resolve, reject) => {
    //   writer.on('finish', resolve);
    //   writer.on('error', () => reject('fail to download script'));
    // });

    const { data } = await axios.get<Buffer>(scriptUrl, { responseType: 'arraybuffer' });
    await fsPromises.writeFile(scriptPath, data);

    // await fsPromises.writeFile(scriptUrl);
    let result: unknown;

    if (ext === 'js') {
      result = await require(scriptPath).run(job.args, mongoDbUrl, outputUrl); // eslint-disable-line @typescript-eslint/no-var-requires
    } else if (ext === 'py') {
      const args = Object.entries(job.args).map(
        ([key, value]) => `${key}#${Array.isArray(value) ? value.join('|') : value}`,
      );
      const pyShell = new PythonShell(scriptPath, { args: [mongoDbUrl ?? 'null', outputUrl ?? 'null', ...args] });
      result = await new Promise(resolve => {
        pyShell.on('message', message => {
          console.log(`Python script result >> ${job.id} - ${scriptPath} >>> %j `, message);
          resolve(message);
        });
      });
    } else {
      throw 'only support javascript & python script';
    }

    await Promise.all([
      fsPromises.rm(scriptPath),
      job.owners?.length && notify(job.owners ?? [], 'JOB', { jobIds: [job._id.toString()] }),
    ]);

    return result;
  } catch (error) {
    await Promise.all([
      fsPromises.rm(scriptPath),
      job.owners?.length && notify(job.owners ?? [], 'JOB', { jobIds: [job._id.toString()] }),
    ]);
    throw error;
  }
};

// get next queued job
const getNextJob = async (jobId?: string | Types.ObjectId) =>
  jobId
    ? Job.findByIdAndUpdate(jobId, { status: JOB.STATUS.RUNNING, startedAt: new Date(), progress: 1 })
    : Job.findOneAndUpdate(
        { status: JOB.STATUS.QUEUED, startAfter: { $gte: new Date() } },
        { status: JOB.STATUS.RUNNING, startedAt: new Date(), progress: 1 },
        { sort: { priority: -1, startedAfter: 1, retry: 1 } },
      );

// timeout promise
const timeout = (milliseconds = DEFAULTS.JOB.TIMEOUT): Promise<void> =>
  new Promise((_, reject) => {
    setTimeout(() => reject('timeout'), milliseconds);
  });

/**
 * Start (or re-schedule) Job Runner
 */
const start = async (jobId?: string | Types.ObjectId): Promise<void> => {
  if (status === 'running') return; // do nothing if another instance is running

  // timeout or re-queue previous running jobs (in case of system crashes previously)
  if (status === 'off') {
    const runningJobs = await Job.find({ status: JOB.STATUS.RUNNING }).sort({ startedAt: 1 });
    for (const job of runningJobs) {
      if (Date.now() - job.startedAt!.getTime() > job.scriptTimeout)
        job.retry >= DEFAULTS.JOB.RETRY
          ? await Job.findByIdAndUpdate(job, { status: JOB.STATUS.TIMEOUT, completedAt: new Date() }).lean()
          : await Job.findByIdAndUpdate(job, { status: JOB.STATUS.QUEUED, $inc: { retry: 1 } }).lean();
    }
  }

  status = 'running';
  clearTimeout(timer);
  let reStartsInMs = DEFAULTS.JOB.SLEEP; // re-start in milliseconds

  let job = await getNextJob(jobId);
  console.log(`DEBUG>>>>> Job-Runner status: ${status}, timer: ${timer}, jobID: ${job?._id}, (${new Date()})`);

  while (job) {
    const completed = { status: JOB.STATUS.COMPLETED, progress: 100, completedAt: new Date() };
    try {
      if (job.script === 'dispatch' && job.args.questions) {
        // dispatch question
        const { questions } = job.args;
        if (!Array.isArray(questions) || !questions.length) throw `invalid dispatch questions/${questions}`;

        reStartsInMs = await questionDispatch(questions[0]);
        await Job.findByIdAndUpdate(
          job,
          reStartsInMs
            ? { status: JOB.STATUS.QUEUED, startAfter: addMilliseconds(Date.now(), reStartsInMs) }
            : completed,
        ).lean();
      } else if (job.script === 'sync') {
        // sync between hub & satellite
        await Promise.race([sync(job.args), timeout()]);
        await Job.findByIdAndUpdate(job, completed).lean();
      } else if (job.script.startsWith('analytic#')) {
        // run report
        const script = await Script.findById(job.script.replace('analytic#', ''));
        if (!script) throw 'invalid scriptId';
        const url = await minioClient.presignedPutObject(
          privateBucket,
          randomString('xlsx'),
          Math.ceil(script.timeout / 1000),
        );
        await Promise.race([downloadAndRun(job, script.url, mongoDbUrl, url), timeout(script.timeout)]);
        await Job.findByIdAndUpdate(job, { ...completed, result: { url } }).lean();
        console.log(`report result ${job._id}, result URL: ${url}`);
      } else if (job.script.startsWith('generator#') || job.script.startsWith('grader#')) {
        // generate content (e.g. assignment)
        const script = await Script.findById(job.script.replace('generator#', '').replace('grader#', ''));
        if (!script) throw { type: 'report', msg: 'invalid scriptId' };
        const result = await Promise.race([downloadAndRun(job, script.url), timeout(script.timeout)]);
        await Job.findByIdAndUpdate(job, { ...completed, result }).lean();
        console.log(`generator result ${job._id} : `, result);
        // TODO: save back to assignment directly. ......
      } else {
        throw 'unknown script';
      }
    } catch (error) {
      console.log(`jobRunner try-catch error() =>> ${error}`);
      if (error === 'timeout') {
        reStartsInMs = 5000; // re-try in 5 seconds if timeout

        log('warn', `jobId: ${job._id} timeout, retries: ${job.retry} (${job.retry >= DEFAULTS.JOB.RETRY})`);
        job.retry >= DEFAULTS.JOB.RETRY
          ? await Job.findByIdAndUpdate(job, { status: JOB.STATUS.TIMEOUT, completedAt: new Date() }).lean()
          : await Job.findByIdAndUpdate(job, {
              status: JOB.STATUS.QUEUED,
              $inc: { retry: 1 },
              startAfter: addMilliseconds(new Date(), reStartsInMs),
            }).lean();
      } else {
        log('error', `jobId: ${jobId}, message: ${error}`);
        await Job.findByIdAndUpdate(job, {
          status: JOB.STATUS.ERROR,
          completedAt: new Date(),
          result: { error },
        }).lean();
      }
    } finally {
      job = await getNextJob();
    }
  }

  timer = setTimeout(start, (reStartsInMs || DEFAULTS.JOB.SLEEP) + 100); // restart once a while
  status = 'sleep';
};

const stop = () => {
  redis.disconnect();
  // worker.terminate()
};

export default { start, stop };
