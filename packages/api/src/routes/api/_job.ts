// TODO: WIP
/**
 * Route: Jobs
 *
 * queue job to runner (executing) Python or Javascript
 */

import { LOCALE } from '@argonne/common';
import { Router } from 'express';

import Job from '../../models/job';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';

type ReqBodyAddJob = {
  script: string;
  emails: string[];
  argument?: string;
};

const { DB_ENUM } = LOCALE;
const router = Router();

/**
 * @route   POST api/scripts/:script
 * @desc    execute a script
 */
router.post('/', async (req, res, next): Promise<void> => {
  // const { script, emails, argument } = req.body as ReqBodyAddJob;

  // const user = (await User.findOneActive({_id: req.userId})) as UserDocument; // authGetUser()

  // const priority = user.roles.includes(DB_ENUM.USER.ROLE.ROOT)
  //   ? PriorityEnum.Highest
  //   : user.roles.includes(DB_ENUM.USER.ROLE.ADMIN)
  //   ? PriorityEnum.High
  //   : PriorityEnum.Normal;

  // const job = await Job.create({
  //   status: 'queueu', //  TASK.STATUS.QUEUED,
  //   flags: ['alex'],
  //   tags: ['a'],
  //   // script: 'A',
  //   // emails: ['Alex@gmail.com'],
  //   // script: 'Alex',
  //   // argument: 'A',
  //   // priority: 1,
  // });

  // TODO: publish redis 'job:new'

  // TODO: redis.ts subscribe 'job:complete', 'job:error' channel,send socket to users[]

  res.send(201).json({ data: { id: 'QueueId' } });
});

export default router;
