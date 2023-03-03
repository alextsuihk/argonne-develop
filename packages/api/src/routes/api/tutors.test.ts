/**
 * JEST Test: /api/tutors routes
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE2,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
  shuffle,
} from '../../jest';
import Level from '../../models/level';
import Subject from '../../models/subject';
import type { TutorDocument } from '../../models/tutor';
import Tutor from '../../models/tutor';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { QUESTION } = LOCALE.DB_ENUM;
const { getMany, getUnauthenticated, createUpdateDelete } = commonTest;

const route = 'tutors';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUser: LeanDocument<UserDocument> | null;
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let tenantAdmin: LeanDocument<UserDocument> | null;
  let tenantId: string | null;

  // expected MINIMUM single credential format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    tenant: expect.any(String),
    user: expect.any(String),

    credentials: expect.any(Array), // could be empty array
    specialties: expect.any(Array), // could be an empty array for newly created tutor
    rankingUpdatedAt: expect.any(String),
  };

  const expectedCredentialMinFormat = {
    _id: expectedIdFormat,
    title: expect.any(String),
    proofs: expect.any(Array),
    updatedAt: expect.any(String),
  };

  const expectedSpecialtyMinFormat = {
    _id: expectedIdFormat,
    lang: expect.toBeOneOf(Object.keys(QUESTION.LANG)),
    level: expect.any(String),
    subject: expect.any(String),
    ranking: {
      correctness: expect.any(Number),
      punctuality: expect.any(Number),
      explicitness: expect.any(Number),
    },
  };

  beforeAll(async () => {
    ({ normalUser, normalUsers, tenantAdmin, tenantId } = await jestSetup(['admin', 'normal', 'tenantAdmin']));
  });
  afterAll(jestTeardown);

  test('should response an array of tutors (as student)', async () => {
    // find an intersection of levels of tutors & normalUsers
    const tutors = await Tutor.find({
      'specialties.level': {
        $in: normalUsers!.map(user => user.histories[0]?.level.toString()).filter(lvl => !!lvl),
      },
      deletedAt: { $exists: false },
    }).lean();
    const [{ level }] = tutors.sort(shuffle)[0].specialties.sort(shuffle);
    const student = normalUsers!.find(({ histories }) => histories[0]?.level.toString() === level.toString());

    await getMany<TutorDocument>(route, { 'Jest-User': student!._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  // There is no naLevel tutor initially
  test.skip('should pass when getMany & getById (as teacher)', async () => {
    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();

    const teacher = normalUsers!.find(
      ({ histories }) => histories[0] && histories[0].level.toString() === teacherLevel!._id.toString(),
    );
    await getMany<TutorDocument>(route, { 'Jest-User': teacher!._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should pass when getMany & getById (as tenantAdmin)', async () =>
    getMany<TutorDocument>(route, { 'Jest-User': tenantAdmin!._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should fail when GET many without authenticated', async () => getUnauthenticated(route, {}));

  test('should fail when GET one without authenticated', async () =>
    getUnauthenticated(`${route}/${normalUser!._id}`, {}));

  test('should fail when adding a tutor without identifiedAt', async () => {
    expect.assertions(3);

    // create a new user (without identifiedAt)
    const user = await User.create({ tenants: [tenantId!], name: `tutor-${FAKE}` });

    await createUpdateDelete(route, { 'Jest-User': tenantAdmin!._id }, [
      {
        action: 'create', // tenantAdmin creates (add) new tutor
        data: { tenantId: tenantId!, userId: user._id.toString() },
        expectedResponse: {
          statusCode: 422,
          data: { type: 'plain', statusCode: 422, errors: [{ code: MSG_ENUM.USER_INPUT_ERROR }] },
        },
      },
    ]);

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass the full suite', async () => {
    expect.assertions(3 * (11 + 1));

    // create a new user (with identifiedAt)
    const user = await User.create({ tenants: [tenantId!], name: `tutor-${FAKE}`, identifiedAt: new Date() });
    const userId = user._id.toString();

    const updateIntro = { intro: FAKE, ...(prob(0.5) && { officeHour: FAKE2 }) };

    const subjects = await Subject.find({ deletedAt: { $exists: false } }).lean();
    const [subject] = subjects.sort(shuffle);
    const subjectId = subject._id.toString();
    const levelId = randomId(subject.levels);

    const [lang] = Object.keys(QUESTION.LANG).sort(shuffle);
    const credential = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const specialty = { lang, subject: subjectId, level: levelId, ...(prob(0.5) && { note: `specialty ${FAKE}` }) };

    const tutor = await createUpdateDelete<TutorDocument>(
      route,
      { 'Jest-User': userId },
      [
        {
          action: 'create', // tenantAdmin creates (add) new tutor
          headers: { 'Jest-User': tenantAdmin!._id },
          data: { tenantId: tenantId!, userId },
          expectedMinFormat: { ...expectedMinFormat, tenant: tenantId!, user: userId },
        },
        {
          action: 'update', // new tutor updates intro & officeHour
          data: updateIntro,
          expectedMinFormat: { ...expectedMinFormat, ...updateIntro },
        },
        {
          action: 'addRemark', // tenantAdmin addRemark
          headers: { 'Jest-User': tenantAdmin!._id },
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(tenantAdmin!, FAKE) },
        },
        {
          action: 'addCredential', // tutor addCredential
          data: credential,
          expectedMinFormat: {
            ...expectedMinFormat,
            credentials: [expect.objectContaining({ ...expectedCredentialMinFormat, ...credential })],
          },
        },
        {
          action: 'addSpecialty', // tutor addSpecialty
          data: specialty,
          expectedMinFormat: {
            ...expectedMinFormat,
            specialties: [expect.objectContaining({ ...expectedSpecialtyMinFormat, ...specialty })],
          },
        },
      ],
      { skipAssertion: true },
    );

    const tutorId = tutor!._id.toString();
    const credentialId = tutor!.credentials[0]._id.toString();
    const specialtyId = tutor!.specialties[0]._id.toString();

    await createUpdateDelete<TutorDocument>(
      route,
      { 'Jest-User': tenantAdmin!._id },
      [
        {
          action: 'verifyCredential', // tenantAdmin verifyCredential
          data: { credentialId },
          expectedMinFormat: {
            ...expectedMinFormat,
            credentials: [
              expect.objectContaining({
                ...expectedCredentialMinFormat,
                ...credential,
                verifiedAt: expect.any(String),
              }),
            ],
          },
        },
        {
          action: 'removeCredential', // tutor removeCredential
          headers: { 'Jest-User': userId },
          data: { credentialId },
          expectedMinFormat: { ...expectedMinFormat, credentials: [] },
        },
        {
          action: 'removeSpecialty', // tutor removeSpecialty
          headers: { 'Jest-User': userId },
          data: { specialtyId },
          expectedMinFormat: { ...expectedMinFormat, specialties: [] }, // deleted specialties are hidden
        },
        {
          action: 'addSpecialty', // tutor re-addSpecialty
          headers: { 'Jest-User': userId },
          data: specialty,
          expectedMinFormat: {
            ...expectedMinFormat,
            specialties: [expect.objectContaining({ ...expectedSpecialtyMinFormat, ...specialty })],
          },
        },
        { action: 'delete', data: {} }, //tenantAdmin removes tutor
        {
          action: 'create', // tenantAdmin re-creates (re-add) tutor
          data: { tenantId: tenantId!, userId },
          expectedMinFormat: {
            ...expectedMinFormat,
            tenant: tenantId!,
            user: userId,
            specialties: [expect.objectContaining({ ...expectedSpecialtyMinFormat, ...specialty })],
          },
        },
      ],
      { skipAssertion: true, overrideId: tutorId },
    );

    // remove specialty and re-add

    // remove tutor and re-add

    // clean up
    await User.deleteOne({ _id: userId });
  });
});
