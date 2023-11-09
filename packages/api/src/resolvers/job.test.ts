/**
 * Jest: /resolvers/job
 *
 */

import 'jest-extended';

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';

import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedDateFormat,
  expectedIdFormat,
  jestSetup,
  jestTeardown,
  mongoId,
} from '../jest';
import Job, { queueJob } from '../models/job';
import { GET_JOB, GET_JOBS, REMOVE_JOB } from '../queries/job';

const { MSG_ENUM } = LOCALE;
const { JOB } = LOCALE.DB_ENUM;

// Top level of this test suite:
describe('Job GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    status: expect.toBeOneOf(Object.keys(JOB.STATUS)),
    task: expect.toBeOneOf(['grade', 'report']),
    grade: expect.toBeOneOf([null, { tenantId: expect.any(String), assignmentId: expect.any(String) }]),
    report: expect.toBeOneOf([
      null,
      { tenantId: expect.any(String), file: expect.any(String), arg: expect.any(String) },
    ]),

    priority: expect.any(Number),
    startAfter: expectedDateFormat(true),
    attempt: expect.any(Number),
    startedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
    progress: expect.any(Number),
    completedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
    result: expect.toBeOneOf([null, expect.any(String)]),

    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass with full-suite', async () => {
    expect.assertions(4);

    const { tenantId } = jest;
    const assignmentId = mongoId();

    // create a grade job
    const job = await queueJob({
      task: 'grade',
      owners: [jest.normalUser._id],
      tenantId: mongoId(tenantId),
      assignmentId,
      startAfter: addDays(Date.now(), 10),
    });

    const expected = {
      ...expectedNormalFormat,
      _id: job._id.toString(),
      status: JOB.STATUS.COMPLETED, // COMPLETED because of test-mod
      task: 'grade',
      grade: { tenantId, assignmentId: assignmentId.toString() },
      report: null,
      attempt: 0,
      startedAt: null,
      progress: 100, // for test-mode 100% complete
      completedAt: expectedDateFormat(true),
      result: 'Skip Execution in Test Mode',
    };

    // get one
    const oneRes = await apolloTestServer.executeOperation(
      { query: GET_JOB, variables: { id: job._id.toString() } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(oneRes, 'data', { job: expected });

    // get many
    const manyRes = await apolloTestServer.executeOperation(
      { query: GET_JOBS },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(manyRes, 'data', { jobs: expect.arrayContaining([expected]) });

    // fail to cancel COMPLETE job
    const failRes = await apolloTestServer.executeOperation(
      { query: REMOVE_JOB, variables: { id: job._id.toString() } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(failRes, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // cancel the gradeJob
    await Job.updateOne({ _id: job._id }, { status: JOB.STATUS.QUEUED }); // revert back to QUEUED status
    const removeRes = await apolloTestServer.executeOperation(
      { query: REMOVE_JOB, variables: { id: job._id.toString() } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(removeRes, 'data', {
      removeJob: { ...expected, status: JOB.STATUS.CANCELED, completedAt: expectedDateFormat(true) },
    });

    // clean up
    await Job.deleteOne({ _id: job._id });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_JOB },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_JOB, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });
});
