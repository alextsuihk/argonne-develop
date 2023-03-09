/**
 * JEST Test: /api/classrooms routes
 *
 */

import type { LeanDocument } from 'mongoose';

import {
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE2,
  genClassroomUsers,
  idsToString,
  jestSetup,
  jestTeardown,
  prob,
} from '../../jest';
import Book from '../../models/book';
import type { ClassroomDocument } from '../../models/classroom';
import Classroom from '../../models/classroom';
import Level from '../../models/level';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { schoolYear, shuffle } from '../../utils/helper';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany } = commonTest;

const route = 'classrooms';

// expected MINIMUM single district format
export const expectedMinFormat = {
  _id: expectedIdFormat,
  flags: expect.any(Array),
  tenant: expect.any(String),
  level: expect.any(String),
  subject: expect.any(String),
  year: expect.any(String),
  schoolClass: expect.any(String),
  // title: expect.any(String),
  // room: expect.any(String),
  // schedule: expect.any(String),

  books: expect.any(Array), // could be an empty array
  teachers: expect.arrayContaining([expect.any(String)]),
  students: expect.arrayContaining([expect.any(String)]),
  chats: expect.any(Array),
  assignments: expect.any(Array),

  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let tenantAdmin: LeanDocument<UserDocument> | null;

  let teacherLevelId: string;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ tenantAdmin, tenantId } = await jestSetup(['tenantAdmin']));

    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    teacherLevelId = teacherLevel!._id.toString();
  });
  afterAll(jestTeardown);

  test('should pass when getMany & getById (as student)', async () => {
    const classrooms = await Classroom.find({
      tenant: tenantId!,
      'students.0': { $exists: true },
      deletedAt: { $exists: false },
    }).lean();
    const studentId = classrooms.sort(shuffle)[0]!.students.sort(shuffle)[0]!;

    await getMany(route, { 'Jest-User': studentId }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should pass when getMany & getById (as teacher)', async () => {
    const classrooms = await Classroom.find({
      tenant: tenantId!,
      'teachers.0': { $exists: true },
      deletedAt: { $exists: false },
    }).lean();
    const teacherId = classrooms.sort(shuffle)[0]!.teachers.sort(shuffle)[0]!;

    await getMany(route, { 'Jest-User': teacherId }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should pass the full suite', async () => {
    expect.assertions(3 * 12 + 1 * 6);

    const [books, tenant] = await Promise.all([
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Tenant.findById(tenantId!),
    ]);

    const [{ _id: book, subjects, level }] = books.sort(shuffle);
    const [subject] = subjects.sort(shuffle);
    const schoolClass = `${level.toString().slice(-1)}-A`;

    const newStudents = genClassroomUsers(tenantId!, tenant!.school!, level, schoolClass, 20);
    const newTeachers = genClassroomUsers(tenantId!, tenant!.school!, teacherLevelId, schoolClass, 3);
    await User.create([...newStudents, ...newTeachers]);

    const [student0, ...students] = newStudents;
    const [teacher0, ...teachers] = newTeachers;

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

    const classroom = await createUpdateDelete<ClassroomDocument>(
      route,
      { 'Jest-User': tenantAdmin!._id },
      [
        {
          action: 'create', // tenantAdmin creates a new classroom
          data: { tenantId: tenantId!, ...create },
          expectedMinFormat: { ...expectedMinFormat, ...create, tenant: tenantId!, students: [], teachers: [] },
        },
        {
          action: 'addTeachers', // tenantAdmin add teachers
          data: { userIds: [teacher0._id.toString()] },
          expectedMinFormat: { ...expectedMinFormat, students: [], teachers: [teacher0._id.toString()] },
        },
        {
          action: 'addStudents', // tenantAdmin add teachers
          data: { userIds: idsToString(students) },
          expectedMinFormat: { ...expectedMinFormat, students: idsToString(students) },
        },
        {
          action: 'addRemark', // tenantAdmin adds remark
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(tenantAdmin!, FAKE) },
        },
        {
          action: 'addRemark', // teacher could also add remark
          headers: { 'Jest-User': teacher0!._id },
          data: { remark: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            remarks: [
              expect.objectContaining({ m: FAKE }), // addRemark by tenantAdmin
              expect.objectContaining({ u: teacher0!._id.toString(), m: FAKE }), //
            ],
          },
        },
        {
          action: 'addTeachers', // teacher add teachers
          headers: { 'Jest-User': teacher0!._id },
          data: { userIds: idsToString(teachers) },
          expectedMinFormat: {
            ...expectedMinFormat,
            teachers: [teacher0._id.toString(), ...idsToString(teachers)],
          },
        },
        {
          action: 'addStudents', // teacher add students
          headers: { 'Jest-User': teacher0!._id },
          data: { userIds: [student0._id.toString()] },
          expectedMinFormat: { ...expectedMinFormat, students: [...idsToString(students), student0._id.toString()] },
        },
        {
          action: 'removeStudents', // teacher remove students
          headers: { 'Jest-User': teacher0!._id },
          data: { userIds: [student0._id.toString()] },
          expectedMinFormat: { ...expectedMinFormat, students: idsToString(students) },
        },
        {
          action: 'removeTeachers', // tenantAdmin remove teachers
          data: { userIds: [teacher0._id.toString()] },
          expectedMinFormat: { ...expectedMinFormat, teachers: idsToString(teachers) },
        },
        { action: 'delete', data: {} }, // tenantAdmin remove classroom
        {
          action: 'recover', // tenantAdmin recover (un-delete) classroom
          data: prob(0.5) ? { remark: FAKE } : {},
          expectedMinFormat,
        },
        {
          action: 'update', // tenantAdmin update class
          data: { tenantId: tenantId!, ...update },
          expectedMinFormat: { ...expectedMinFormat, ...update },
        },
      ],
      { skipAssertion: true, skipDeleteCheck: true },
    );

    // final delete
    await createUpdateDelete<ClassroomDocument>(
      route,
      { 'Jest-User': tenantAdmin!._id },
      [{ action: 'delete', data: {} }],
      { skipAssertion: true, overrideId: classroom!._id.toString() },
    );

    // clean up
    await User.deleteMany({ _id: { $in: [...newStudents, ...newTeachers] } });
  });
});
