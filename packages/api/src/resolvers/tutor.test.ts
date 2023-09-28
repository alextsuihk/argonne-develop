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
  testServer,
} from '../jest';
import Level from '../models/level';
import Subject from '../models/subject';
import Tutor, { TutorDocument } from '../models/tutor';
import type { Id, UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_TUTOR,
  ADD_TUTOR_CREDENTIAL,
  ADD_TUTOR_REMARK,
  ADD_TUTOR_SPECIALTY,
  GET_TUTOR,
  GET_TUTORS,
  REMOVE_TUTOR,
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
  let normalUsers: (UserDocument & Id)[] | null;
  let tenantAdmin: (UserDocument & Id) | null;
  let tenantAdminServer: ApolloServer | null;
  let tenantId: string | null;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    tenant: expectedIdFormat,
    user: expectedIdFormat,

    intro: expect.toBeOneOf([null, expect.any(String)]),
    officeHour: expect.toBeOneOf([null, expect.any(String)]),

    credentials: expect.any(Array), // could be empty array
    specialties: expect.any(Array), // could be an empty array for newly created tutor
    rankingUpdatedAt: expectedDateFormat(true),
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
    note: expect.toBeOneOf([null, expect.any(String)]),
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
    ({ guestServer, normalServer, normalUsers, tenantAdmin, tenantAdminServer, tenantId } = await jestSetup(
      ['guest', 'normal', 'tenantAdmin'],
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
    const tutor = randomItem(tutorsRes.data!.tutors as (TutorDocument & Id)[]);
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

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as student)', async () => {
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
    await getMany(testServer(student));
  });

  // There is no tutor (with naLevel) initially
  test.skip('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as teacher)', async () => {
    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    const teacher = normalUsers!.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw `No valid teacher for testing`;

    await getMany(testServer(teacher));
  });

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as tenantAdmin)', async () =>
    getMany(tenantAdminServer!));

  test('should fail when query as guest', async () => {
    expect.assertions(2);

    const res = await guestServer!.executeOperation({ query: GET_TUTORS });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const res2 = await guestServer!.executeOperation({
      query: GET_TUTOR,
      variables: { id: FAKE_ID },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when adding a tutor without identifiedAt', async () => {
    expect.assertions(1);

    // create a new user (without identifiedAt)
    const user = genUser(tenantId!);
    await user.save();

    // tenantAdmin addTutor
    const res = await tenantAdminServer!.executeOperation({
      query: ADD_TUTOR,
      variables: { tenantId: tenantId!, userId: user._id.toString() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // clean-up
    await User.deleteOne({ _id: user });
  });

  test('should pass the full suite', async () => {
    expect.assertions(11);

    // create a new user (with identifiedAt)
    const user = genUser(tenantId!, { identifiedAt: new Date() });
    await user.save();
    const userServer = testServer(user);
    const userId = user._id.toString();

    // tenantAdmin addTutor
    const createdRes = await tenantAdminServer!.executeOperation({
      query: ADD_TUTOR,
      variables: { tenantId: tenantId!, userId },
    });
    apolloExpect(createdRes, 'data', { addTutor: { ...expectedFormat, tenant: tenantId!, user: userId } });
    const tutorId = createdRes.data!.addTutor._id;

    // new tutor updates intro & officeHour
    const updateIntro = { intro: FAKE, ...(prob(0.5) && { officeHour: FAKE2 }) };
    const updateRes = await userServer!.executeOperation({
      query: UPDATE_TUTOR,
      variables: { id: tutorId, ...updateIntro },
    });
    apolloExpect(updateRes, 'data', { updateTutor: { ...expectedFormat, ...updateIntro } });

    // tenantAdmin addRemark
    const addRemarkRes = await tenantAdminServer!.executeOperation({
      query: ADD_TUTOR_REMARK,
      variables: { id: tutorId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addTutorRemark: { ...expectedFormat, ...expectedRemark(tenantAdmin!._id, FAKE, true) },
    });

    // tutor addCredential
    const credential = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const addCredentialRes = await userServer.executeOperation({
      query: ADD_TUTOR_CREDENTIAL,
      variables: { id: tutorId, ...credential },
    });
    apolloExpect(addCredentialRes, 'data', {
      addTutorCredential: {
        ...expectedFormat,
        credentials: [{ ...expectedCredentialFormat, ...credential }],
      },
    });

    // tenantAdmin verifyCredential
    const credentialId = addCredentialRes.data!.addTutorCredential.credentials[0]._id;
    const verifyCredentialRes = await tenantAdminServer!.executeOperation({
      query: VERIFY_TUTOR_CREDENTIAL,
      variables: { id: tutorId, credentialId },
    });
    apolloExpect(verifyCredentialRes, 'data', {
      verifyTutorCredential: {
        ...expectedFormat,
        credentials: [{ ...expectedCredentialFormat, ...credential, verifiedAt: expectedDateFormat(true) }],
      },
    });

    // tutor removeCredential
    const removeCredentialRes = await userServer.executeOperation({
      query: REMOVE_TUTOR_CREDENTIAL,
      variables: { id: tutorId, credentialId },
    });
    apolloExpect(removeCredentialRes, 'data', { removeTutorCredential: { ...expectedFormat, credentials: [] } });

    // tutor addSpecialty
    const subject = randomItem(await Subject.find({ deletedAt: { $exists: false } }).lean());
    const level = randomItem(subject.levels).toString();

    const lang = randomItem(Object.keys(QUESTION.LANG));
    const specialty = { lang, subject: subject._id.toString(), level, ...(prob(0.5) && { note: `specialty ${FAKE}` }) };
    const addSpecialtyRes = await userServer.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: tutorId, ...specialty },
    });
    apolloExpect(addSpecialtyRes, 'data', {
      addTutorSpecialty: {
        ...expectedFormat,
        specialties: [{ ...expectedSpecialtyFormat, ...specialty }],
      },
    });
    const specialtyId = addSpecialtyRes.data!.addTutorSpecialty.specialties[0]._id;

    // tutor removeSpecialty
    const removeSpecialtyRes = await userServer.executeOperation({
      query: REMOVE_TUTOR_SPECIALTY,
      variables: { id: tutorId, specialtyId },
    });
    apolloExpect(removeSpecialtyRes, 'data', {
      removeTutorSpecialty: { ...expectedFormat, specialties: [] },
    });

    // tutor re-addSpecialty
    const reAddSpecialtyRes = await userServer.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: tutorId, ...specialty },
    });
    apolloExpect(reAddSpecialtyRes, 'data', {
      addTutorSpecialty: {
        ...expectedFormat,
        specialties: [{ ...expectedSpecialtyFormat, ...specialty }],
      },
    });

    //tenantAdmin removes tutor
    const removedRes = await tenantAdminServer!.executeOperation({
      query: REMOVE_TUTOR,
      variables: { id: tutorId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeTutor: { code: MSG_ENUM.COMPLETED } });

    // tenantAdmin re-creates (re-add) tutor
    const reCreatedRes = await tenantAdminServer!.executeOperation({
      query: ADD_TUTOR,
      variables: { tenantId: tenantId!, userId },
    });
    apolloExpect(reCreatedRes, 'data', {
      addTutor: {
        ...expectedFormat,
        tenant: tenantId!,
        user: userId,
        specialties: [{ ...expectedSpecialtyFormat, ...specialty }],
      },
    });

    // final, clean up
    await User.deleteOne({ _id: user });
  });

  test('should fail when adding specialty without lang, level, subject', async () => {
    expect.assertions(3);

    const lang = randomItem(Object.keys(QUESTION.LANG));

    // add without lang
    const res1 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: FAKE_ID, level: FAKE_ID, subject: FAKE_ID },
    });
    apolloExpect(res1, 'error', 'Variable "$lang" of required type "String!" was not provided.');

    // add without level
    const res2 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: FAKE_ID, lang, subject: FAKE_ID },
    });
    apolloExpect(res2, 'error', 'Variable "$level" of required type "String!" was not provided.');

    // add without subject
    const res3 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: FAKE_ID, lang, level: FAKE_ID },
    });
    apolloExpect(res3, 'error', 'Variable "$subject" of required type "String!" was not provided.');
  });

  test('should fail when adding specialty without AUTH', async () => {
    expect.assertions(1);

    // add a document
    const res = await guestServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: FAKE_ID, lang: FAKE, subject: FAKE_ID, level: FAKE_ID },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });
});
