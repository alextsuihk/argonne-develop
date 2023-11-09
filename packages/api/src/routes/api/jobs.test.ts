/**
 * JEST Test: /api/jobs routes
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import { expectedDateFormat, expectedIdFormat, jestSetup, jestTeardown, mongoId } from '../../jest';
import Job, { queueJob } from '../../models/job';
import commonTest from './rest-api-test';

const { JOB } = LOCALE.DB_ENUM;

const { createUpdateDelete, getMany } = commonTest;

const route = 'jobs';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single job format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    status: expect.toBeOneOf(Object.keys(JOB.STATUS)),
    task: expect.toBeOneOf(['grade', 'report']),
    grade: { tenantId: expect.any(String), assignmentId: expect.any(String) },

    priority: expect.any(Number),
    startAfter: expectedDateFormat(),
    attempt: expect.any(Number),
    progress: expect.any(Number),

    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  const gradeJob = async (jest: Awaited<ReturnType<typeof jestSetup>>) =>
    queueJob({
      task: 'grade',
      owners: [jest.normalUser._id],
      tenantId: mongoId(jest.tenantId),
      assignmentId: mongoId(),
      startAfter: addDays(Date.now(), 10),
    });

  test('should pass when getMany & getById', async () => {
    const job = await gradeJob(jest);
    await getMany(route, { 'Jest-User': jest.normalUser._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });

    await Job.deleteOne({ _id: job._id }); // clean-up
  });

  test('should pass with full-suite', async () => {
    const job = await gradeJob(jest);
    await Job.updateOne({ _id: job._id }, { status: JOB.STATUS.QUEUED }); // revert back to QUEUED status

    await createUpdateDelete(
      route,
      { 'Jest-User': jest.normalUser._id },
      [{ action: 'delete', data: {}, expectedMinFormat }],
      { overrideId: job._id.toString(), skipDeleteCheck: true },
    );

    await Job.deleteOne({ _id: job._id }); // clean-up
  });
});
