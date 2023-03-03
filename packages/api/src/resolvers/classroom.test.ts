/**
 * Jest: /resolvers/classroom
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  apolloExpect,
  ApolloServer,
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE2,
  genClassroomUsers,
  idsToString,
  jestSetup,
  jestTeardown,
  prob,
  shuffle,
  testServer,
} from '../jest';
import Book from '../models/book';
import Classroom from '../models/classroom';
import Level from '../models/level';
import Tenant from '../models/tenant';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_CLASSROOM,
  ADD_CLASSROOM_REMARK,
  ADD_CLASSROOM_STUDENTS,
  ADD_CLASSROOM_TEACHERS,
  GET_CLASSROOM,
  GET_CLASSROOMS,
  RECOVER_CLASSROOM,
  REMOVE_CLASSROOM,
  REMOVE_CLASSROOM_STUDENTS,
  REMOVE_CLASSROOM_TEACHERS,
  UPDATE_CLASSROOM,
} from '../queries/classroom';
import { schoolYear } from '../utils/helper';

const { MSG_ENUM } = LOCALE;

// Top chat of this test suite:
describe('Classroom GraphQL', () => {
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let tenantAdmin: LeanDocument<UserDocument> | null;
  let tenantAdminServer: ApolloServer | null;
  let teacherLevelId: string;
  let tenantId: string | null;

  const expectedNormalFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    tenant: expect.any(String),
    level: expect.any(String),
    subject: expect.any(String),
    year: expect.any(String),
    schoolClass: expect.any(String),
    title: expect.toBeOneOf([null, expect.any(String)]),
    room: expect.toBeOneOf([null, expect.any(String)]),
    schedule: expect.toBeOneOf([null, expect.any(String)]),

    books: expect.any(Array), // could be an empty array
    teachers: expect.arrayContaining([expect.any(String)]),
    students: expect.arrayContaining([expect.any(String)]),
    chats: expect.any(Array),
    assignments: expect.any(Array),

    remarks: null,
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  const expectedAdminFormat = {
    ...expectedNormalFormat,
    remarks: expect.any(Array), // could be empty array without any remarks
  };

  beforeAll(async () => {
    ({ guestServer, normalServer, tenantAdmin, tenantAdminServer, tenantId } = await jestSetup(
      ['guest', 'normal', 'tenantAdmin'],
      {
        apollo: true,
      },
    ));

    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    teacherLevelId = teacherLevel!._id.toString();
  });

  afterAll(jestTeardown);

  test('should response an array of data when GET all & Get One (as student & teacher)', async () => {
    expect.assertions(4);

    const classrooms = await Classroom.find({
      tenant: tenantId!,
      'students.0': { $exists: true },
      'teachers.0': { $exists: true },
      deletedAt: { $exists: false },
    }).lean();

    const classroom = classrooms.sort(shuffle)[0]!;
    const studentId = classroom.students.sort(shuffle)[0]!;
    const teacherId = classroom.teachers.sort(shuffle)[0]!;

    const [student, teacher] = await Promise.all([
      User.findOneActive({ _id: studentId }),
      User.findOneActive({ _id: teacherId }),
    ]);

    const studentServer = testServer(student!);
    const teacherServer = testServer(teacher!);

    // student
    const studentAllRes = await studentServer.executeOperation({ query: GET_CLASSROOMS });
    apolloExpect(studentAllRes, 'data', { classrooms: expect.arrayContaining([expectedNormalFormat]) });

    const studentOneRes = await studentServer!.executeOperation({
      query: GET_CLASSROOM,
      variables: { id: classroom._id.toString() },
    });
    apolloExpect(studentOneRes, 'data', { classroom: expectedNormalFormat });

    // teacher
    const teacherAllRes = await teacherServer.executeOperation({ query: GET_CLASSROOMS });
    apolloExpect(teacherAllRes, 'data', { classrooms: expect.arrayContaining([expectedAdminFormat]) });

    const teacherOneRes = await teacherServer!.executeOperation({
      query: GET_CLASSROOM,
      variables: { id: classroom._id.toString() },
    });
    apolloExpect(teacherOneRes, 'data', { classroom: expectedAdminFormat });
  });

  test('should fail when GET all (as guest)', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_CLASSROOMS });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET One by ID (as guest)', async () => {
    expect.assertions(1);

    const classroom = await Classroom.findOne().lean();
    const res = await guestServer!.executeOperation({
      query: GET_CLASSROOM,
      variables: { id: classroom!._id.toString() },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_CLASSROOM });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_CLASSROOM, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should pass the full suite', async () => {
    expect.assertions(14);
    const [books, tenant] = await Promise.all([
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Tenant.findById(tenantId!),
    ]);

    const [{ _id: book, subjects, level }] = books.sort(shuffle);
    const [subject] = subjects.sort(shuffle);
    const schoolClass = `${level.toString().slice(-1)}-A`;

    const [student0, student1, ...students] = genClassroomUsers(tenantId!, tenant!.school!, level, schoolClass, 30);
    const [teacher0, ...teachers] = genClassroomUsers(tenantId!, tenant!.school!, teacherLevelId, schoolClass, 3);

    await User.create([student0, student1, ...students, teacher0, ...teachers]);

    const student0Id = student0._id.toString();
    const student1Id = student1._id.toString();
    const teacher0Id = teacher0._id.toString();

    const teacher0Server = testServer(teacher0);

    const create = {
      level: level.toString(),
      subject: subject.toString(),
      year: schoolYear(),
      schoolClass,
      ...(prob(0.5) && { title: FAKE }),
      ...(prob(0.5) && { room: FAKE }),
      ...(prob(0.5) && { schedule: FAKE }),
      books: prob(0.9) ? [book.toString()] : [],
    };

    const update = { title: FAKE2, room: FAKE2, schedule: FAKE2, books: [book.toString()] };

    // tenantAdmin add classroom
    const createdRes = await tenantAdminServer!.executeOperation({
      query: ADD_CLASSROOM,
      variables: { tenantId: tenantId!, ...create },
    });
    apolloExpect(createdRes, 'data', {
      addClassroom: { ...expectedAdminFormat, ...create, tenant: tenantId!, students: [], teachers: [] },
    });
    const newId: string = createdRes.data!.addClassroom._id;

    // tenantAdmin add teachers
    const addTeachersRes = await tenantAdminServer!.executeOperation({
      query: ADD_CLASSROOM_TEACHERS,
      variables: { id: newId, userIds: [teacher0Id] },
    });
    apolloExpect(addTeachersRes, 'data', {
      addClassroomTeachers: { ...expectedAdminFormat, students: [], teachers: [teacher0Id] },
    });

    // tenantAdmin add students
    const addStudentsRes = await tenantAdminServer!.executeOperation({
      query: ADD_CLASSROOM_STUDENTS,
      variables: { id: newId, userIds: idsToString(students) },
    });
    apolloExpect(addStudentsRes, 'data', {
      addClassroomStudents: { ...expectedAdminFormat, students: idsToString(students) },
    });

    // tenantAdmin addRemark
    const addRemarkRes = await tenantAdminServer!.executeOperation({
      query: ADD_CLASSROOM_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemarkRes, 'data', {
      addClassroomRemark: { ...expectedAdminFormat, ...expectedRemark(tenantAdmin!, FAKE, true) },
    });

    // teacher addRemark
    const addRemark2Res = await teacher0Server.executeOperation({
      query: ADD_CLASSROOM_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemark2Res, 'data', {
      addClassroomRemark: {
        ...expectedAdminFormat,
        ...expectedRemark(teacher0!, FAKE, true),
        remarks: [
          { _id: expectedIdFormat, t: expect.any(Number), u: expect.any(String), m: FAKE }, // first addRemark by tenantAdmin
          { _id: expectedIdFormat, t: expect.any(Number), u: teacher0!._id.toString(), m: FAKE }, //
        ],
      },
    });

    // teacher adds teachers
    const addTeachers2Res = await teacher0Server.executeOperation({
      query: ADD_CLASSROOM_TEACHERS,
      variables: { id: newId, userIds: idsToString(teachers) },
    });
    apolloExpect(addTeachers2Res, 'data', {
      addClassroomTeachers: { ...expectedAdminFormat, teachers: [teacher0Id, ...idsToString(teachers)] },
    });

    // teacher adds students
    const addStudents2Res = await teacher0Server.executeOperation({
      query: ADD_CLASSROOM_STUDENTS,
      variables: { id: newId, userIds: [student0Id, student1Id] },
    });
    apolloExpect(addStudents2Res, 'data', {
      addClassroomStudents: { ...expectedAdminFormat, students: [...idsToString(students), student0Id, student1Id] },
    });

    // teacher removes students
    const removeStudentsRes = await teacher0Server.executeOperation({
      query: REMOVE_CLASSROOM_STUDENTS,
      variables: { id: newId, userIds: [student0Id, student1Id] },
    });
    apolloExpect(removeStudentsRes, 'data', {
      removeClassroomStudents: { ...expectedAdminFormat, students: idsToString(students) },
    });

    // teacher readds ONE student
    const addStudents3Res = await teacher0Server.executeOperation({
      query: ADD_CLASSROOM_STUDENTS,
      variables: { id: newId, userIds: [student0Id] },
    });
    apolloExpect(addStudents3Res, 'data', {
      addClassroomStudents: { ...expectedAdminFormat, students: [...idsToString(students), student0Id] },
    });

    // tenantAdmin removes teachers
    const removeTeachersRes = await tenantAdminServer!.executeOperation({
      query: REMOVE_CLASSROOM_TEACHERS,
      variables: { id: newId, userIds: [teacher0Id] },
    });
    apolloExpect(removeTeachersRes, 'data', {
      removeClassroomTeachers: { ...expectedAdminFormat, teachers: idsToString(teachers) },
    });

    // tenantAdmin removes classroom
    const removedRes = await tenantAdminServer!.executeOperation({
      query: REMOVE_CLASSROOM,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeClassroom: { code: MSG_ENUM.COMPLETED } });

    // tenantAdmin recovers (un-delete) classroom
    const recoverRes = await tenantAdminServer!.executeOperation({
      query: RECOVER_CLASSROOM,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(recoverRes, 'data', { recoverClassroom: expectedAdminFormat });

    // tenantAdmin updates classroom
    const updatedRes = await tenantAdminServer!.executeOperation({
      query: UPDATE_CLASSROOM,
      variables: { id: newId, ...update },
    });
    apolloExpect(updatedRes, 'data', {
      updateClassroom: { ...expectedAdminFormat, ...update },
    });

    // tenantAdmin removes classroom
    const finalRemovedRes = await tenantAdminServer!.executeOperation({
      query: REMOVE_CLASSROOM,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(finalRemovedRes, 'data', { removeClassroom: { code: MSG_ENUM.COMPLETED } });

    // clean up
    await User.deleteMany({ _id: { $in: [...students, ...teachers] } });
  });
});
