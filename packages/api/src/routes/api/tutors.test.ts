/**
 * JEST Test: /api/tutors routes
 *
 */

import { LOCALE } from '@argonne/common';

import {
  expectedDateFormat,
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE2,
  genUser,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
} from '../../jest';
import Level from '../../models/level';
import Subject from '../../models/subject';
import type { TutorDocument } from '../../models/tutor';
import Tutor from '../../models/tutor';
import type { Id, UserDocument } from '../../models/user';
import User from '../../models/user';
import commonTest from './rest-api-test';

const { MSG_ENUM } = LOCALE;
const { QUESTION } = LOCALE.DB_ENUM;
const { getMany, getUnauthenticated, createUpdateDelete } = commonTest;

const route = 'tutors';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUser: (UserDocument & Id) | null;
  let normalUsers: (UserDocument & Id)[] | null;
  let tenantAdmin: (UserDocument & Id) | null;
  let tenantId: string | null;

  // expected MINIMUM single credential format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    tenant: expectedIdFormat,
    user: expectedIdFormat,

    credentials: expect.any(Array), // could be empty array
    specialties: expect.any(Array), // could be an empty array for newly created tutor
    rankingUpdatedAt: expectedDateFormat(),

    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),
  };

  const expectedCredentialMinFormat = {
    _id: expectedIdFormat,
    title: expect.any(String),
    proofs: expect.any(Array),
    updatedAt: expectedDateFormat(),
  };

  const expectedSpecialtyMinFormat = {
    _id: expectedIdFormat,
    lang: expect.toBeOneOf(Object.keys(QUESTION.LANG)),
    level: expectedIdFormat,
    subject: expectedIdFormat,
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

  test('should pass when getMany & getById (as student)', async () => {
    // find an intersection of levels of tutors & normalUsers
    const tutors = await Tutor.find({
      'specialties.level': { $in: normalUsers!.map(user => user.schoolHistories[0]?.level).filter(lvl => !!lvl) },
      deletedAt: { $exists: false },
    }).lean();
    const tutorLevels = tutors.map(t => t.specialties.map(s => s.level)).flat();
    const student = normalUsers!.find(
      ({ schoolHistories }) => schoolHistories[0] && tutorLevels.some(lvl => lvl.equals(schoolHistories[0].level)),
    );
    if (!student) throw `No valid student for testing`;

    await getMany<TutorDocument>(route, { 'Jest-User': student._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  // There is no tutor (with naLevel) initially
  test.skip('should pass when getMany & getById (as teacher)', async () => {
    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    const teacher = normalUsers!.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw `No valid teacher for testing`;

    await getMany<TutorDocument>(route, { 'Jest-User': teacher._id }, expectedMinFormat, {
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
    const user = genUser(tenantId!);
    await user.save();

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
    await User.deleteOne({ _id: user });
  });

  test('should pass the full suite', async () => {
    expect.assertions(3 * (11 + 1));

    // create a new user (with identifiedAt)
    const user = genUser(tenantId!, { identifiedAt: new Date() });
    await user.save();
    const userId = user._id.toString();

    const updateIntro = { intro: FAKE, ...(prob(0.5) && { officeHour: FAKE2 }) };

    const subject = randomItem(await Subject.find({ deletedAt: { $exists: false } }).lean());
    const level = randomItem(subject.levels).toString();

    const lang = randomItem(Object.keys(QUESTION.LANG));
    const credential = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const specialty = { lang, subject: subject._id.toString(), level, ...(prob(0.5) && { note: `specialty ${FAKE}` }) };

    const tutor = await createUpdateDelete<TutorDocument & Id>(
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
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(tenantAdmin!._id, FAKE) },
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

    await createUpdateDelete<TutorDocument & Id>(
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
                verifiedAt: expectedDateFormat(),
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
