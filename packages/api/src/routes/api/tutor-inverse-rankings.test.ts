/**
 * JEST Test: /api/tutor-inverse-rankings routes
 *
 */

import { expectedIdFormat, jestSetup, jestTeardown, shuffle } from '../../jest';
import Question from '../../models/question';
import commonTest from './rest-api-test';

const { getMany } = commonTest;

const route = 'tutor-inverse-rankings';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedFormat = {
    _id: expectedIdFormat,
    correctness: expect.toBeOneOf([null, expect.any(Number)]), // mongo aggregate return null for no value (not able to average)
    explicitness: expect.toBeOneOf([null, expect.any(Number)]),
    punctuality: expect.toBeOneOf([null, expect.any(Number)]),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () => {
    const questions = await Question.find({
      tenant: jest.tenantId,
      tutor: { $exists: true },
      correctness: { $exists: true },
      explicitness: { $exists: true },
      punctuality: { $exists: true },
    }).lean();
    if (!questions.length) throw 'No questions with proper ranking info to proceed';

    const tutorUserIds = questions.map(q => q.tutor).sort(shuffle);
    const tutorUser = jest.normalUsers.find(u => tutorUserIds.some(tutorUserId => tutorUserId!.equals(u._id)));

    await getMany(route, { 'Jest-User': tutorUser!._id }, expectedFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });
});
