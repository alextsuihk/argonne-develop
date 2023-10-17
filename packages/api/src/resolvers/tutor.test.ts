/**
 * Jest: /resolvers/specialty
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
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
  testServer,
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
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUsers: UserDocument[] | null;
  let adminUser: UserDocument | null;
  let adminServer: ApolloServer | null;
  let tenantId: string | null;

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

  beforeAll(async () => {
    ({ guestServer, normalServer, normalUsers, adminUser, adminServer, tenantId } = await jestSetup(
      ['admin', 'guest', 'normal'],
      {
        apollo: true,
      },
    ));
  });
  afterAll(jestTeardown);

  // common test: testing GetAll, GetById, invalidId, nonExistingId
  const getMany = async (server: ApolloServer) => {
    expect.assertions(4);

    // get many
    const tutorsRes = await server.executeOperation({ query: GET_TUTORS });
    apolloExpect(tutorsRes, 'data', { tutors: expect.arrayContaining([expectedFormat]) });

    // get one
    const tutor = randomItem(tutorsRes.data!.tutors as TutorDocument[]);
    const tutorRes = await server.executeOperation({ query: GET_TUTOR, variables: { id: tutor._id } });

    apolloExpect(tutorRes, 'data', { tutor: expectedFormat });

    // fail with invalid ID
    const invalidIdRes = await server.executeOperation({ query: GET_TUTOR, variables: { id: 'INVALID-ID' } });
    apolloExpect(invalidIdRes, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);

    // return empty arrays with nonExistingId
    const nonExistingIdRes = await server.executeOperation({
      query: GET_TUTOR,
      variables: { id: FAKE_ID },
    });
    apolloExpect(nonExistingIdRes, 'data', { tutor: null });
  };

  // student could only see tutors with his/her level (specialty)
  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as student)', async () => {
    // find an intersection of levels of tutors & normalUsers
    const tutors = await Tutor.find({
      'specialties.level': { $in: normalUsers!.map(user => user.schoolHistories[0]?.level).filter(lvl => !!lvl) },
      deletedAt: { $exists: false },
    }).lean();

    const tutorLevels = tutors
      .map(t => t.specialties.map(s => s.level))
      .flat()
      .sort(shuffle);

    const student = normalUsers!.find(
      ({ schoolHistories }) => schoolHistories[0] && tutorLevels.some(lvl => lvl.equals(schoolHistories[0].level)),
    );

    if (!student) throw `No valid student for testing`;
    await getMany(testServer(student));
  });

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as teacher)', async () => {
    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    const teacher = normalUsers!.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw `No valid teacher for testing`;

    await getMany(testServer(teacher));
  });

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as admin)', async () =>
    getMany(testServer(adminUser)));

  test('should fail when adding credential or specialty without identifiedAt', async () => {
    expect.assertions(2);

    // create a new user (without identifiedAt)
    const user = genUser(tenantId!);
    await user.save();

    const res = await testServer(user).executeOperation({
      query: ADD_TUTOR_CREDENTIAL,
      variables: { title: FAKE, proofs: [FAKE] },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    const res2 = await testServer(user).executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: {
        tenantId,
        ...(prob(0.5) && { note: FAKE }),
        langs: [QUESTION.LANG.CSE],
        level: FAKE_ID,
        subject: FAKE_ID,
      },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass when create a tutor document with upsert()', async () => {
    expect.assertions(2 + 2);

    //  create a new user (with identifiedAt)
    const user = genUser(tenantId!, { identifiedAt: new Date() });
    await user.save();
    const userServer = testServer(user);

    // upsert with addTutorSpecialty
    const subject = randomItem(await Subject.find({ deletedAt: { $exists: false } }).lean());
    const specialty = {
      ...(prob(0.5) && { note: `specialty ${FAKE}` }),
      langs: randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2),
      level: randomItem(subject.levels).toString(),
      subject: subject._id.toString(),
    };
    const addSpecialtyRes = await userServer.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { tenantId, ...specialty },
    });
    apolloExpect(addSpecialtyRes, 'data', {
      addTutorSpecialty: {
        ...expectedFormat,
        specialties: [{ ...expectedSpecialtyFormat, tenant: tenantId, ...specialty, note: specialty.note || null }],
      },
    });
    const tutor1 = await Tutor.findOneAndDelete({ user: addSpecialtyRes.data!.addTutorSpecialty._id }).lean(); // clean up
    expect(tutor1!.user.equals(user._id)).toBeTrue();

    // upsert with addTutorCredential
    const credential = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const addCredentialRes = await userServer.executeOperation({ query: ADD_TUTOR_CREDENTIAL, variables: credential });
    apolloExpect(addCredentialRes, 'data', {
      addTutorCredential: { ...expectedFormat, credentials: [{ ...expectedCredentialFormat, ...credential }] },
    });
    const tutor2 = await Tutor.findOneAndDelete({ user: addSpecialtyRes.data!.addTutorSpecialty._id }).lean(); // clean up
    expect(tutor2!.user.equals(user._id)).toBeTrue();

    // clean up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass the full suite', async () => {
    expect.assertions(8);

    // create a new user (with identifiedAt)
    const user = genUser(tenantId!, { identifiedAt: new Date() });
    await user.save();
    const userServer = testServer(user);

    // tutor addCredential
    const credential = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const addCredentialRes = await userServer.executeOperation({ query: ADD_TUTOR_CREDENTIAL, variables: credential });
    apolloExpect(addCredentialRes, 'data', {
      addTutorCredential: { ...expectedFormat, credentials: [{ ...expectedCredentialFormat, ...credential }] },
    });

    // tutor addCredential (second)
    const credential2 = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const add2CredentialRes = await userServer.executeOperation({
      query: ADD_TUTOR_CREDENTIAL,
      variables: credential2,
    });
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
    const credential2Id = add2CredentialRes.data!.addTutorCredential.credentials[1]._id; // second credential
    const verifyCredentialRes = await adminServer!.executeOperation({
      query: VERIFY_TUTOR_CREDENTIAL,
      variables: { id: user._id.toString(), subId: credential2Id },
    });
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
    const removeCredentialRes = await userServer.executeOperation({
      query: REMOVE_TUTOR_CREDENTIAL,
      variables: { subId: credential2Id },
    });
    apolloExpect(removeCredentialRes, 'data', {
      removeTutorCredential: { ...expectedFormat, credentials: [{ ...expectedCredentialFormat, ...credential }] },
    });

    // adminUser addRemark
    const addRemarkRes = await adminServer!.executeOperation({
      query: ADD_TUTOR_REMARK,
      variables: { id: user._id.toString(), remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addTutorRemark: { ...expectedFormat, ...expectedRemark(adminUser!._id, FAKE, true) },
    });

    // tutor updates intro & officeHour
    const update = { ...(prob(0.8) && { intro: FAKE }), ...(prob(0.8) && { officeHour: FAKE2 }) };
    const updateRes = await userServer!.executeOperation({ query: UPDATE_TUTOR, variables: update });
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
    const addSpecialtyRes = await userServer.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { tenantId, ...specialty },
    });
    apolloExpect(addSpecialtyRes, 'data', {
      addTutorSpecialty: {
        ...expectedFormat,
        specialties: [{ ...expectedSpecialtyFormat, tenant: tenantId, ...specialty, note: specialty.note || null }],
      },
    });

    // tutor removeSpecialty
    const specialtyId = addSpecialtyRes.data!.addTutorSpecialty.specialties[0]._id;
    const removeSpecialtyRes = await userServer.executeOperation({
      query: REMOVE_TUTOR_SPECIALTY,
      variables: { subId: specialtyId },
    });
    apolloExpect(removeSpecialtyRes, 'data', { removeTutorSpecialty: { ...expectedFormat, specialties: [] } });

    // final, clean up
    await Promise.all([User.deleteOne({ _id: user._id }), Tutor.deleteOne({ user: user._id })]);
  });

  test('should fail when adding specialty without lang, level, subject', async () => {
    expect.assertions(3);

    const langs = randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2);

    // add without langs
    const res1 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { tenantId, ...(prob(0.5) && { note: FAKE }), level: FAKE_ID, subject: FAKE_ID },
    });
    apolloExpect(res1, 'error', 'Variable "$langs" of required type "[String!]!" was not provided.');

    // add without level
    const res2 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { tenantId, ...(prob(0.5) && { note: FAKE }), langs, subject: FAKE_ID },
    });
    apolloExpect(res2, 'error', 'Variable "$level" of required type "String!" was not provided.');

    // add without subject
    const res3 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { tenantId, ...(prob(0.5) && { note: FAKE }), langs, level: FAKE_ID },
    });
    apolloExpect(res3, 'error', 'Variable "$subject" of required type "String!" was not provided.');
  });

  test('should fail when adding specialty without AUTH', async () => {
    expect.assertions(1);

    // add a document
    const res = await guestServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { tenantId, ...(prob(0.5) && { note: FAKE }), langs: [], level: FAKE_ID, subject: FAKE_ID },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });
});
