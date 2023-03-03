/**
 * Task: Grade Assignment
 *
 */

// TODO: grade assignment, send notify(tenantId, teacher + students, assignment) & notify(tenantId, teacher, jobId) + satelliteSync()

import { LOCALE } from '@argonne/common';

import Assignment from '../../models/assignment';
import type { JobDocument } from '../../models/job';
import Job from '../../models/job';

const { JOB } = LOCALE.DB_ENUM;

const grade = async (job: JobDocument) => {
  if (job.task === 'grade') {
    if (typeof job.args.assignment !== 'string') throw `invalid assignment grading job ${job._id}`;

    const assignment = await Assignment.findById(job.args.assignment);
    if (!assignment) throw `invalid assignment grading job ${job._id} ${job.args}`;
  }

  const completed = { status: JOB.STATUS.COMPLETED, progress: 100, completedAt: new Date() };
};

export default grade;
