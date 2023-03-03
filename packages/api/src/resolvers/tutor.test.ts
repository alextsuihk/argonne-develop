/**
 * Jest: /resolvers/specialty
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';
import mongoose from 'mongoose';

import {
  apolloExpect,
  ApolloServer,
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE2,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
  shuffle,
  testServer,
} from '../jest';
import Level from '../models/level';
import Subject from '../models/subject';
import Tutor from '../models/tutor';
import User, { UserDocument } from '../models/user';
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
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let tenantAdmin: LeanDocument<UserDocument> | null;
  let tenantAdminServer: ApolloServer | null;
  let tenantId: string | null;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    tenant: expect.any(String),
    user: expect.any(String),

    intro: expect.toBeOneOf([null, expect.any(String)]),
    officeHour: expect.toBeOneOf([null, expect.any(String)]),

    credentials: expect.any(Array), // could be empty array
    specialties: expect.any(Array), // could be an empty array for newly created tutor
    rankingUpdatedAt: expect.any(Number),
    star: expect.toBeOneOf([null, expect.any(Number)]),

    remarks: expect.toBeOneOf([null, expect.any(Array)]),
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  const expectedCredentialFormat = {
    _id: expectedIdFormat,
    title: expect.any(String),
    proofs: expect.any(Array),
    updatedAt: expect.any(Number),
    verifiedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  const expectedSpecialtyFormat = {
    _id: expectedIdFormat,
    note: expect.toBeOneOf([null, expect.any(String)]),
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
    const tutorRes = await server.executeOperation({
      query: GET_TUTOR,
      variables: { id: randomId(tutorsRes.data!.tutors) },
    });

    apolloExpect(tutorRes, 'data', { tutor: expectedFormat });

    // fail with invalid ID
    const invalidIdRes = await server.executeOperation({ query: GET_TUTOR, variables: { id: 'INVALID-ID' } });
    apolloExpect(invalidIdRes, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);

    // return empty arrays with nonExistingId
    const nonExistingIdRes = await server.executeOperation({
      query: GET_TUTOR,
      variables: { id: new mongoose.Types.ObjectId().toString() },
    });
    apolloExpect(nonExistingIdRes, 'data', { tutor: null });
  };

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as student)', async () => {
    // find an intersection of levels of tutors & normalUsers
    const tutors = await Tutor.find({
      'specialties.level': {
        $in: normalUsers!.map(user => user.histories[0]?.level.toString()).filter(lvl => !!lvl),
      },
      deletedAt: { $exists: false },
    }).lean();
    const [{ level }] = tutors.sort(shuffle)[0].specialties.sort(shuffle);
    const student = normalUsers!.find(
      ({ histories }) => histories[0] && histories[0].level.toString() === level.toString(),
    );

    await getMany(testServer(student!));
  });

  // There is no naLevel tutor initially
  test.skip('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as teacher)', async () => {
    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();

    const teacher = normalUsers!.find(
      ({ histories }) => histories[0]?.level.toString() === teacherLevel!._id.toString(),
    );

    await getMany(testServer(teacher!));
  });

  test('should pass when testing GetAll, GetById, invalidId, non nonExistingId (as tenantAdmin)', async () =>
    getMany(tenantAdminServer!));

  test('should fail when query as guest', async () => {
    expect.assertions(2);

    const res = await guestServer!.executeOperation({ query: GET_TUTORS });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

    const res2 = await guestServer!.executeOperation({
      query: GET_TUTOR,
      variables: { id: new mongoose.Types.ObjectId().toString() },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when adding a tutor without identifiedAt', async () => {
    expect.assertions(1);

    // create a new user (without identifiedAt)
    const user = await User.create({ tenants: [tenantId!], name: `tutor-${FAKE}` });

    // tenantAdmin addTutor
    const res = await tenantAdminServer!.executeOperation({
      query: ADD_TUTOR,
      variables: { tenantId: tenantId!, userId: user._id.toString() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass the full suite', async () => {
    expect.assertions(11);

    // create a new user (with identifiedAt)
    const user = await User.create({ tenants: [tenantId!], name: `tutor-${FAKE}`, identifiedAt: new Date() });
    const userServer = testServer(user);
    const userId = user._id.toString();

    // tenantAdmin addTutor
    const createdRes = await tenantAdminServer!.executeOperation({
      query: ADD_TUTOR,
      variables: { tenantId: tenantId!, userId },
    });
    apolloExpect(createdRes, 'data', { addTutor: { ...expectedFormat, tenant: tenantId!, user: userId } });
    const tutorId = createdRes.data!.addTutor._id.toString();

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
      addTutorRemark: { ...expectedFormat, ...expectedRemark(tenantAdmin!, FAKE, true) },
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
    const credentialId = addCredentialRes.data!.addTutorCredential.credentials[0]._id.toString();
    const verifyCredentialRes = await tenantAdminServer!.executeOperation({
      query: VERIFY_TUTOR_CREDENTIAL,
      variables: { id: tutorId, credentialId },
    });
    apolloExpect(verifyCredentialRes, 'data', {
      verifyTutorCredential: {
        ...expectedFormat,
        credentials: [{ ...expectedCredentialFormat, ...credential, verifiedAt: expect.any(Number) }],
      },
    });

    // tutor removeCredential
    const removeCredentialRes = await userServer.executeOperation({
      query: REMOVE_TUTOR_CREDENTIAL,
      variables: { id: tutorId, credentialId },
    });
    apolloExpect(removeCredentialRes, 'data', { removeTutorCredential: { ...expectedFormat, credentials: [] } });

    // tutor addSpecialty
    const subjects = await Subject.find({ deletedAt: { $exists: false } }).lean();
    const [subject] = subjects.sort(shuffle);
    const subjectId = subject._id.toString();
    const levelId = randomId(subject.levels);

    const [lang] = Object.keys(QUESTION.LANG).sort(shuffle);
    const specialty = { lang, subject: subjectId, level: levelId, ...(prob(0.5) && { note: `specialty ${FAKE}` }) };
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
    const specialtyId = addSpecialtyRes.data!.addTutorSpecialty.specialties[0]._id.toString();

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
    await User.deleteOne({ _id: user._id });
  });

  test('should fail when adding specialty without lang, level, subject', async () => {
    expect.assertions(3);

    const id = () => new mongoose.Types.ObjectId().toString();
    const [lang] = Object.keys(QUESTION.LANG).sort(shuffle);

    // add without lang
    const res1 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: id(), level: id(), subject: id() },
    });
    apolloExpect(res1, 'error', 'Variable "$lang" of required type "String!" was not provided.');

    // add without level
    const res2 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: id(), lang, subject: id() },
    });
    apolloExpect(res2, 'error', 'Variable "$level" of required type "String!" was not provided.');

    // add without subject
    const res3 = await normalServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: id(), lang, level: id() },
    });
    apolloExpect(res3, 'error', 'Variable "$subject" of required type "String!" was not provided.');
  });

  test('should fail when adding specialty without AUTH', async () => {
    expect.assertions(1);

    const id = () => new mongoose.Types.ObjectId().toString();

    // add a document
    const res = await guestServer!.executeOperation({
      query: ADD_TUTOR_SPECIALTY,
      variables: { id: id(), lang: FAKE, subject: id(), level: id() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });
});
