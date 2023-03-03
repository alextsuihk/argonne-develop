/**
 * JEST Test: /api/tutor-rankings routes
 *
 */

import type { LeanDocument } from 'mongoose';

import { expectedIdFormat, jestSetup, jestTeardown } from '../../jest';
import Tutor from '../../models/tutor';
import type { UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { getMany } = commonTest;

const route = 'tutor-rankings';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let user: LeanDocument<UserDocument> | undefined;

  const expectedFormat = {
    _id: expectedIdFormat,
    correctness: expect.any(Number),
    explicitness: expect.any(Number),
    punctuality: expect.any(Number),
  };

  beforeAll(async () => {
    const { normalUsers, tenantId } = await jestSetup(['normal'], { apollo: true });

    const tutors = await Tutor.find({ tenant: tenantId }).lean();
    const tutorUserIds = tutors.map(t => t.user.toString());

    user = normalUsers!.find(u => tutorUserIds.includes(u._id.toString()));
  });
  afterAll(jestTeardown);

  test('should pass when getMany & getById', async () =>
    getMany(route, { 'Jest-User': user!._id }, expectedFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));
});
