/**
 * JEST Test: /api/tutor-inverse-rankings routes
 *
 */

import { expectedIdFormat, jestSetup, jestTeardown, shuffle } from '../../jest';
import Question from '../../models/question';
import type { UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { getMany } = commonTest;

const route = 'tutor-inverse-rankings';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let user: UserDocument | undefined;

  const expectedFormat = {
    _id: expectedIdFormat,
    correctness: expect.toBeOneOf([null, expect.any(Number)]), // mongo aggregate return null for no value (not able to average)
    explicitness: expect.toBeOneOf([null, expect.any(Number)]),
    punctuality: expect.toBeOneOf([null, expect.any(Number)]),
  };

  beforeAll(async () => {
    const { normalUsers, tenantId } = await jestSetup(['normal'], { apollo: true });

    const questions = await Question.find({
      tenant: tenantId,
      tutor: { $exists: true },
      correctness: { $exists: true },
      explicitness: { $exists: true },
      punctuality: { $exists: true },
    }).lean();
    if (!questions.length) throw 'No questions with proper ranking info to proceed';

    const tutorUserIds = questions.map(q => q.tutor).sort(shuffle);
    user = normalUsers!.find(u => tutorUserIds.some(tutorUserId => tutorUserId!.equals(u._id)));
  });
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, { 'Jest-User': user!._id }, expectedFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));
});
