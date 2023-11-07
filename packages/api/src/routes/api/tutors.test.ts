/**
 * JEST Test: /api/tutors routes
 *
 */

import { LOCALE } from '@argonne/common';
import request from 'supertest';

import app from '../../app';
import {
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
const { getMany, getUnauthenticated } = commonTest;

const route = 'tutors';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single credential format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    name: expect.any(String),
    credentials: expect.any(Array), // could be empty array
    specialties: expect.any(Array), // could be an empty array for newly created tutor
    rankings: expect.any(Array),

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
    tenant: expectedIdFormat,
    langs: expect.arrayContaining([expect.toBeOneOf(Object.keys(QUESTION.LANG))]),
    level: expectedIdFormat,
    subject: expectedIdFormat,
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById (as student)', async () => {
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
    await getMany<TutorDocument>(route, { 'Jest-User': student._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should pass when getMany & getById (as teacher)', async () => {
    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    const teacher = jest.normalUsers.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw `No valid teacher for testing`;

    console.log('teacherId', teacher._id);
    await getMany<TutorDocument>(route, { 'Jest-User': teacher._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should pass when getMany & getById (as adminUser)', async () =>
    getMany<TutorDocument>(route, { 'Jest-User': jest.adminUser._id }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    }));

  test('should fail when GET many without authenticated', async () => getUnauthenticated(route, {}));

  test('should fail when GET one without authenticated', async () =>
    getUnauthenticated(`${route}/${jest.normalUser._id}`, {}));

  test('should fail when adding credential or specialty without identifiedAt', async () => {
    expect.assertions(3 + 3);

    // create a new user (without identifiedAt)
    const user = genUser(jest.tenantId);
    await user.save();

    // add credential
    const res = await request(app)
      .patch(`/api/${route}/addCredential`)
      .send({ title: FAKE, proofs: [FAKE] })
      .set({ 'Jest-User': user._id });
    expect(res.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res.status).toBe(403);

    // add specialty
    const res2 = await request(app)
      .patch(`/api/${route}/addSpecialty`)
      .send({
        tenantId: jest.tenantId,
        ...(prob(0.5) && { note: FAKE }),
        langs: [QUESTION.LANG.CSE],
        level: FAKE_ID,
        subject: FAKE_ID,
      })
      .set({ 'Jest-User': user._id });
    expect(res2.body).toEqual({ errors: [{ code: MSG_ENUM.UNAUTHORIZED_OPERATION }], statusCode: 403, type: 'plain' });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(403);

    // clean-up
    await User.deleteOne({ _id: user._id });
  });

  test('should pass when create a tutor document with upsert()', async () => {
    expect.assertions(4 + 4);

    //  create two new users (with identifiedAt)
    const user1 = genUser(jest.tenantId, { identifiedAt: new Date() });
    const user2 = genUser(jest.tenantId, { identifiedAt: new Date() });
    await Promise.all([user1.save(), user2.save()]);

    // (user1) upsert with addSpecialty
    const subject = randomItem(await Subject.find({ deletedAt: { $exists: false } }).lean());
    const specialty = {
      ...(prob(0.5) && { note: `specialty ${FAKE}` }),
      langs: randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2),
      level: randomItem(subject.levels).toString(),
      subject: subject._id.toString(),
    };
    const res1 = await request(app)
      .patch(`/api/${route}/addSpecialty`)
      .send({ tenantId: jest.tenantId, ...specialty })
      .set({ 'Jest-User': user1._id });
    expect(res1.body).toEqual({ data: expect.objectContaining(expectedMinFormat) });
    expect(res1.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res1.status).toBe(200);
    const tutor1 = await Tutor.findOneAndDelete({ user: res1.body.data._id }).lean(); // clean up
    expect(tutor1!.user.equals(user1._id)).toBeTrue();

    // (user2) upsert with addCredential
    const res2 = await request(app)
      .patch(`/api/${route}/addCredential`)
      .send({ title: FAKE, proofs: [`${FAKE} PNG`] })
      .set({ 'Jest-User': user2._id });
    expect(res2.body).toEqual({ data: expect.objectContaining(expectedMinFormat) });
    expect(res2.header['content-type']).toBe('application/json; charset=utf-8');
    expect(res2.status).toBe(200);
    const tutor2 = await Tutor.findOneAndDelete({ user: res2.body.data._id }).lean(); // clean up
    expect(tutor2!.user.equals(user2._id)).toBeTrue();

    // clean up
    await Promise.all([
      User.deleteMany({ _id: { $in: [user1._id, user2._id] } }),
      Tutor.deleteMany({ _id: { $in: [tutor1!._id, tutor2!._id] } }),
    ]);
  });

  test('should pass the full suite', async () => {
    expect.assertions(3 * 7);

    // create a new user (with identifiedAt)
    const user = genUser(jest.tenantId, { identifiedAt: new Date() });
    await user.save();

    // upsert with addCredential
    const credential = { title: FAKE, proofs: [`${FAKE} PNG`] };
    const addCredentialRes = await request(app)
      .patch(`/api/${route}/addCredential`)
      .send(credential)
      .set({ 'Jest-User': user._id });
    expect(addCredentialRes.body).toEqual({
      data: expect.objectContaining({
        ...expectedMinFormat,
        credentials: [expect.objectContaining({ ...expectedCredentialMinFormat, ...credential })],
      }),
    });
    expect(addCredentialRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addCredentialRes.status).toBe(200);

    // adminUser verifyCredential (second credential)
    const credentialId = addCredentialRes.body.data.credentials[0]._id;
    const verifyCredentialRes = await request(app)
      .patch(`/api/${route}/verifyCredential`)
      .send({ id: user._id, subId: credentialId })
      .set({ 'Jest-User': jest.adminUser._id });
    expect(verifyCredentialRes.body).toEqual({
      data: expect.objectContaining({
        ...expectedMinFormat,
        credentials: [
          expect.objectContaining({ ...expectedCredentialMinFormat, ...credential, verifiedAt: expectedDateFormat() }),
        ],
      }),
    });
    expect(verifyCredentialRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(verifyCredentialRes.status).toBe(200);

    // tutor removeCredential
    const removeCredentialRes = await request(app)
      .patch(`/api/${route}/removeCredential`)
      .send({ subId: credentialId })
      .set({ 'Jest-User': user._id });
    expect(removeCredentialRes.body).toEqual({
      data: expect.objectContaining({ ...expectedMinFormat, credentials: [] }),
    });
    expect(removeCredentialRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeCredentialRes.status).toBe(200);

    // adminUser addRemark
    const addRemarkRes = await request(app)
      .patch(`/api/${route}/addRemark`)
      .send({ id: user._id, remark: FAKE })
      .set({ 'Jest-User': jest.adminUser._id });
    expect(addRemarkRes.body).toEqual({
      data: expect.objectContaining({ ...expectedMinFormat, ...expectedRemark(jest.adminUser._id, FAKE) }),
    });
    expect(addRemarkRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addRemarkRes.status).toBe(200);

    // tutor updates intro & officeHour
    const update = { ...(prob(0.8) && { intro: FAKE }), ...(prob(0.8) && { officeHour: FAKE2 }) };
    const updateRes = await request(app).patch(`/api/${route}`).send(update).set({ 'Jest-User': user._id });
    expect(updateRes.body).toEqual({ data: expect.objectContaining({ ...expectedMinFormat, ...update }) });
    expect(updateRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(updateRes.status).toBe(200);

    // upsert with addSpecialty
    const subject = randomItem(await Subject.find({ deletedAt: { $exists: false } }).lean());
    const specialty = {
      ...(prob(0.5) && { note: `specialty ${FAKE}` }),
      langs: randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2),
      level: randomItem(subject.levels).toString(),
      subject: subject._id.toString(),
    };
    const addSpecialtyRes = await request(app)
      .patch(`/api/${route}/addSpecialty`)
      .send({ tenantId: jest.tenantId, ...specialty })
      .set({ 'Jest-User': user._id });
    expect(addSpecialtyRes.body).toEqual({
      data: expect.objectContaining({
        ...expectedMinFormat,
        specialties: [expect.objectContaining({ ...expectedSpecialtyMinFormat, tenant: jest.tenantId, ...specialty })],
      }),
    });
    expect(addSpecialtyRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(addSpecialtyRes.status).toBe(200);

    // tutor removeSpecialty
    const specialtyId = addSpecialtyRes.body.data.specialties[0]._id;
    const removeSpecialtyRes = await request(app)
      .patch(`/api/${route}/removeSpecialty`)
      .send({ subId: specialtyId })
      .set({ 'Jest-User': user._id });
    expect(removeSpecialtyRes.body).toEqual({
      data: expect.objectContaining({ ...expectedMinFormat, specialties: [] }),
    });
    expect(removeSpecialtyRes.header['content-type']).toBe('application/json; charset=utf-8');
    expect(removeSpecialtyRes.status).toBe(200);

    // clean up
    await Promise.all([User.deleteOne({ _id: user._id }), Tutor.deleteOne({ user: user._id })]);
  });
});
