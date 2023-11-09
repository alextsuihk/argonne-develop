/**
 * Jest: /resolvers/specialty
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloContext,
  apolloExpect,
  apolloTestServer,
  expectedDateFormat,
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE_ID,
  FAKE2,
  genUser,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomItems,
  shuffle,
} from '../jest';
import Level from '../models/level';
import Subject from '../models/subject';
import Tutor, { TutorDocument } from '../models/tutor';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_TUTOR_CREDENTIAL,
  ADD_TUTOR_REMARK,
  ADD_TUTOR_SPECIALTY,
  GET_TUTOR,
  GET_TUTORS,
  REMOVE_TUTOR_CREDENTIAL,
  REMOVE_TUTOR_SPECIALTY,
  UPDATE_TUTOR,
  VERIFY_TUTOR_CREDENTIAL,
} from '../queries/tutor';

const { MSG_ENUM } = LOCALE;
const { QUESTION } = LOCALE.DB_ENUM;

// Top specialty of this test suite:
describe('Tutor GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    name: expect.any(String),
    intro: expect.toBeOneOf([null, expect.any(String)]),
    officeHour: expect.toBeOneOf([null, expect.any(String)]),

    credentials: expect.any(Array), // could be empty array
    specialties: expect.any(Array), // could be an empty array for newly created tutor
    rankings: expect.any(Array),
    star: expect.toBeOneOf([null, expect.any(Number)]),

    remarks: expect.toBeOneOf([null, expect.any(Array)]),
    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  const expectedCredentialFormat = {
    _id: expectedIdFormat,
    title: expect.any(String),
    proofs: expect.any(Array),
    updatedAt: expectedDateFormat(true),
    verifiedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  const expectedSpecialtyFormat = {
    _id: expectedIdFormat,
    tenant: expectedIdFormat,
    note: expect.toBeOneOf([null, expect.any(String)]),
    langs: expect.arrayContaining([expect.toBeOneOf(Object.keys(QUESTION.LANG))]),
    level: expectedIdFormat,
    subject: expectedIdFormat,
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  // common test: testing GetAll, GetById, invalidId, nonExistingId
  const getMany = async (user: UserDocument | null) => {
    expect.assertions(4);

    // get many
    const tutorsRes = await apolloTestServer.executeOperation<{ tutors: TutorDocument[] }>(
      { query: GET_TUTORS },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(tutorsRes, 'data', { tutors: expect.arrayContaining([expectedFormat]) });

    // get one
    const tutor = tutorsRes.body.kind === 'single' ? randomItem(tutorsRes.body.singleResult.data!.tutors) : null;
    const tutorRes = await apolloTestServer.executeOperation(
      { query: GET_TUTOR, variables: { id: tutor!._id } },
      { contextValue: apolloContext(user) },
    );

    apolloExpect(tutorRes, 'data', { tutor: expectedFormat });

    // fail with invalid ID
    const invalidIdRes = await apolloTestServer.executeOperation(
      { query: GET_TUTOR, variables: { id: 'INVALID-ID' } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(invalidIdRes, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // return empty arrays with nonExistingId
    const nonExistingIdRes = await apolloTestServer.executeOperation(
      { query: GET_TUTOR, variables: { id: FAKE_ID } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(nonExistingIdRes, 'data', { tutor: null });
  };

  // student could see tutors with his/her level (specialty)
  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as student)', async () => {
    // find an intersection of levels of tutors & normalUsers
    const levelIds = jest.normalUsers.map(user => user.schoolHistories[0]?.level).filter(lvl => !!lvl);
    const tutors = await Tutor.find({ 'specialties.level': { $in: levelIds }, deletedAt: { $exists: false } }).lean();

    const tutorLevels = tutors
      .map(t => t.specialties.map(s => s.level))
      .flat()
      .sort(shuffle);

    const student = jest.normalUsers.find(
      ({ schoolHistories }) => schoolHistories[0] && tutorLevels.some(lvl => lvl.equals(schoolHistories[0].level)),
    );

    if (!student) throw `No valid student for testing`;
    await getMany(student);
  });

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as teacher)', async () => {
    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    const teacher = jest.normalUsers.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw `No valid teacher for testing`;

    await getMany(teacher);
  });

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as admin)', async () =>
    getMany(jest.adminUser));

  test('should fail when adding credential or specialty without identifiedAt', async () => {
    expect.assertions(2);

    // create a new user (without identifiedAt)
    const user = genUser(jest.tenantId);
    await user.save();

    const res = await apolloTestServer.executeOperation(
      { query: ADD_TUTOR_CREDENTIAL, variables: { title: FAKE, proofs: [FAKE] } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    const res2 = await apolloTestServer.executeOperation(
      {
        query: ADD_TUTOR_SPECIALTY,
        variables: {
          tenantId: jest.tenantId,
          ...(prob(0.5) && { note: FAKE }),
          langs: [QUESTION.LANG.CSE],
          level: FAKE_ID,
          subject: FAKE_ID,
        },
      },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass when create a tutor document with upsert()', async () => {
    expect.assertions(2 + 2);

    //  create two new users (with identifiedAt)
    const user1 = genUser(jest.tenantId, { identifiedAt: new Date() });
    const user2 = genUser(jest.tenantId, { identifiedAt: new Date() });
    await Promise.all([user1.save(), user2.save()]);

    // (user1) upsert with addTutorSpecialty
    const subject = randomItem(await Subject.find({ deletedAt: { $exists: false } }).lean());
    const specialty = {
      ...(prob(0.5) && { note: `specialty ${FAKE}` }),
      langs: randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2),
      level: randomItem(subject.levels).toString(),
      subject: subject._id.toString(),
    };
    const addSpecialtyRes = await apolloTestServer.executeOperation<{ addTutorSpecialty: TutorDocument }>(
      { query: ADD_TUTOR_SPECIALTY, variables: { tenantId: jest.tenantId, ...specialty } },
      { contextValue: apolloContext(user1) },
    );
    apolloExpect(addSpecialtyRes, 'data', {
      addTutorSpecialty: {
        ...expectedFormat,
        specialties: [
          { ...expectedSpecialtyFormat, tenant: jest.tenantId, ...specialty, note: specialty.note || null },
        ],
      },
    });

    const user1Id =
      addSpecialtyRes.body.kind === 'single'
        ? addSpecialtyRes.body.singleResult.data!.addTutorSpecialty._id.toString()
        : null;
    const tutor1 = await Tutor.findOneAndDelete({ user: user1Id }).lean(); // clean up
    expect(tutor1!.user.equals(user1._id)).toBeTrue();

    // (user2) upsert with addTutorCredential
    const credential = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const addCredentialRes = await apolloTestServer.executeOperation<{ addTutorCredential: TutorDocument }>(
      { query: ADD_TUTOR_CREDENTIAL, variables: credential },
      { contextValue: apolloContext(user2) },
    );
    apolloExpect(addCredentialRes, 'data', {
      addTutorCredential: { ...expectedFormat, credentials: [{ ...expectedCredentialFormat, ...credential }] },
    });

    const user2Id =
      addCredentialRes.body.kind === 'single'
        ? addCredentialRes.body.singleResult.data!.addTutorCredential._id.toString()
        : null;
    const tutor2 = await Tutor.findOneAndDelete({ user: user2Id }).lean(); // clean up
    expect(tutor2!.user.equals(user2._id)).toBeTrue();

    // clean up
    await Promise.all([
      User.deleteMany({ _id: { $in: [user1._id, user2._id] } }),
      Tutor.deleteMany({ _id: { $in: [tutor1!._id, tutor2!._id] } }),
    ]);
  });

  test('should pass the full suite', async () => {
    expect.assertions(8);

    // create a new user (with identifiedAt)
    const user = genUser(jest.tenantId, { identifiedAt: new Date() });
    await user.save();

    // tutor addCredential
    const credential = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const addCredentialRes = await apolloTestServer.executeOperation(
      { query: ADD_TUTOR_CREDENTIAL, variables: credential },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(addCredentialRes, 'data', {
      addTutorCredential: { ...expectedFormat, credentials: [{ ...expectedCredentialFormat, ...credential }] },
    });

    // tutor addCredential (second)
    const credential2 = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const add2CredentialRes = await apolloTestServer.executeOperation<{ addTutorCredential: TutorDocument }>(
      { query: ADD_TUTOR_CREDENTIAL, variables: credential2 },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(add2CredentialRes, 'data', {
      addTutorCredential: {
        ...expectedFormat,
        credentials: [
          { ...expectedCredentialFormat, ...credential },
          { ...expectedCredentialFormat, ...credential2 },
        ],
      },
    });

    // adminUser verifyCredential (second credential)
    const credential2Id =
      add2CredentialRes.body.kind === 'single'
        ? add2CredentialRes.body.singleResult.data!.addTutorCredential.credentials[1]._id.toString()
        : null; // second credential
    const verifyCredentialRes = await apolloTestServer.executeOperation(
      { query: VERIFY_TUTOR_CREDENTIAL, variables: { id: user._id.toString(), subId: credential2Id } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(verifyCredentialRes, 'data', {
      verifyTutorCredential: {
        ...expectedFormat,
        credentials: [
          { ...expectedCredentialFormat, ...credential },
          { ...expectedCredentialFormat, ...credential, verifiedAt: expectedDateFormat(true) },
        ],
      },
    });

    // tutor removeCredential
    const removeCredentialRes = await apolloTestServer.executeOperation(
      { query: REMOVE_TUTOR_CREDENTIAL, variables: { subId: credential2Id } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(removeCredentialRes, 'data', {
      removeTutorCredential: { ...expectedFormat, credentials: [{ ...expectedCredentialFormat, ...credential }] },
    });

    // adminUser addRemark
    const addRemarkRes = await apolloTestServer.executeOperation(
      { query: ADD_TUTOR_REMARK, variables: { id: user._id.toString(), remark: FAKE } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(addRemarkRes, 'data', {
      addTutorRemark: { ...expectedFormat, ...expectedRemark(jest.adminUser._id, FAKE, true) },
    });

    // tutor updates intro & officeHour
    const update = { ...(prob(0.8) && { intro: FAKE }), ...(prob(0.8) && { officeHour: FAKE2 }) };
    const updateRes = await apolloTestServer.executeOperation(
      { query: UPDATE_TUTOR, variables: update },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(updateRes, 'data', {
      updateTutor: { ...expectedFormat, intro: update.intro || null, officeHour: update.officeHour || null },
    });

    // tutor addSpecialty
    const subjects = await Subject.find({ deletedAt: { $exists: false } }).lean();
    const subject = randomItem(subjects);
    const specialty = {
      ...(prob(0.5) && { note: `specialty ${FAKE}` }),
      langs: randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2),
      level: randomItem(subject.levels).toString(),
      subject: subject._id.toString(),
    };
    const addSpecialtyRes = await apolloTestServer.executeOperation<{ addTutorSpecialty: TutorDocument }>(
      { query: ADD_TUTOR_SPECIALTY, variables: { tenantId: jest.tenantId, ...specialty } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(addSpecialtyRes, 'data', {
      addTutorSpecialty: {
        ...expectedFormat,
        specialties: [
          { ...expectedSpecialtyFormat, tenant: jest.tenantId, ...specialty, note: specialty.note || null },
        ],
      },
    });

    // tutor removeSpecialty
    const specialtyId =
      addSpecialtyRes.body.kind === 'single'
        ? addSpecialtyRes.body.singleResult.data!.addTutorSpecialty.specialties[0]._id.toString()
        : null;
    const removeSpecialtyRes = await apolloTestServer.executeOperation(
      { query: REMOVE_TUTOR_SPECIALTY, variables: { subId: specialtyId } },
      { contextValue: apolloContext(user) },
    );
    apolloExpect(removeSpecialtyRes, 'data', { removeTutorSpecialty: { ...expectedFormat, specialties: [] } });

    // final, clean up
    await Promise.all([User.deleteOne({ _id: user._id }), Tutor.deleteOne({ user: user._id })]);
  });

  test('should fail when adding specialty without lang, level, subject', async () => {
    expect.assertions(3);

    const langs = randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2);

    // add without langs
    const res1 = await apolloTestServer.executeOperation(
      {
        query: ADD_TUTOR_SPECIALTY,
        variables: { tenantId: jest.tenantId, ...(prob(0.5) && { note: FAKE }), level: FAKE_ID, subject: FAKE_ID },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res1, 'error', 'Variable "$langs" of required type "[String!]!" was not provided.');

    // add without level
    const res2 = await apolloTestServer.executeOperation(
      {
        query: ADD_TUTOR_SPECIALTY,
        variables: { tenantId: jest.tenantId, ...(prob(0.5) && { note: FAKE }), langs, subject: FAKE_ID },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', 'Variable "$level" of required type "String!" was not provided.');

    // add without subject
    const res3 = await apolloTestServer.executeOperation(
      {
        query: ADD_TUTOR_SPECIALTY,
        variables: { tenantId: jest.tenantId, ...(prob(0.5) && { note: FAKE }), langs, level: FAKE_ID },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res3, 'error', 'Variable "$subject" of required type "String!" was not provided.');
  });

  test('should fail when adding specialty without AUTH', async () => {
    expect.assertions(1);

    // add a document
    const res = await apolloTestServer.executeOperation(
      {
        query: ADD_TUTOR_SPECIALTY,
        variables: {
          tenantId: jest.tenantId,
          ...(prob(0.5) && { note: FAKE }),
          langs: [],
          level: FAKE_ID,
          subject: FAKE_ID,
        },
      },
      { contextValue: apolloContext(null) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });
});
