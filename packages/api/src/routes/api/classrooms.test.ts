/**
 * JEST Test: /api/classrooms routes
 *
 */

import { LOCALE } from '@argonne/common';

import type { ClassroomDocumentEx } from '../../controllers/classroom';
import {
  expectedChatFormat,
  expectedIdFormat,
  expectedMember,
  expectedRemark,
  FAKE,
  FAKE2,
  genChatGroup,
  genClassroom,
  genClassroomUsers,
  genClassroomWithAssignment,
  genQuestion,
  jestSetup,
  jestTeardown,
  prob,
} from '../../jest';
import Book from '../../models/book';
import Classroom from '../../models/classroom';
import Content from '../../models/content';
import Level from '../../models/level';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { randomItem, schoolYear } from '../../utils/helper';
import commonTest from './rest-api-test';

const { CHAT } = LOCALE.DB_ENUM;
const { createUpdateDelete, getMany, getUnauthenticated } = commonTest;

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

  remarks: expect.any(Array), // could be empty array for non publisherAdmin or admin

  createdAt: expect.any(String),
  updatedAt: expect.any(String),

  contentsToken: expect.any(String),
};

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let normalUser: UserDocument | null;
  let tenantAdmin: UserDocument | null;
  let tenantId: string | null;

  beforeAll(async () => {
    ({ normalUser, tenantAdmin, tenantId } = await jestSetup(['normal', 'tenantAdmin']));
  });
  afterAll(jestTeardown);

  test('should pass when getMany & getById (as student)', async () => {
    const classrooms = await Classroom.find({
      tenant: tenantId!,
      students: { $ne: [] },
      teachers: { $ne: [] },
      deletedAt: { $exists: false },
    }).lean();
    const classroom = randomItem(classrooms);
    const studentId = randomItem(classroom.students);
    if (!studentId) throw `no studentId is available ${classrooms.length}`;

    await getMany(route, { 'Jest-User': studentId }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should pass when getMany & getById (as teacher)', async () => {
    const classrooms = await Classroom.find({
      tenant: tenantId!,
      students: { $ne: [] },
      teachers: { $ne: [] },
      deletedAt: { $exists: false },
    }).lean();
    const classroom = randomItem(classrooms);
    const teacherId = randomItem(classroom.teachers);

    await getMany(route, { 'Jest-User': teacherId }, expectedMinFormat, {
      testGetById: true,
      testInvalidId: true,
      testNonExistingId: true,
    });
  });

  test('should fail when accessing as guest', async () => getUnauthenticated(route, {}));

  test('should pass when attaching chat from another chatGroup', async () => {
    const { classroom } = await genClassroom(tenantId!, normalUser!._id);
    const { chatGroup: source, chat, content } = genChatGroup(tenantId!, normalUser!._id);
    await Promise.all([classroom.save(), source.save(), chat.save(), content.save()]);
    //! Note: at the point, classroom.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    await createUpdateDelete<ClassroomDocumentEx>(
      route,
      { 'Jest-User': normalUser!._id },
      [
        {
          action: 'attachChatGroup',
          data: { id: classroom._id.toString(), chatId: chat._id.toString(), sourceId: source._id.toString() },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                _id: chat._id.toString(),
                contents: [content._id.toString()],
              }),
            ],
          },
        },
      ],
      { overrideId: classroom._id.toString() },
    );

    // clean-up (as the documents are only partially formatted)

    await Promise.all([classroom.deleteOne(), source.deleteOne()]);
  });

  test('should pass when attaching chat from another classroom', async () => {
    const [{ classroom }, { classroom: source, chat, content }] = await Promise.all([
      genClassroom(tenantId!, normalUser!._id),
      genClassroom(tenantId!, normalUser!._id),
    ]);
    await Promise.all([classroom.save(), source.save(), chat.save(), content.save()]);
    //! Note: at the point, classroom.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    await createUpdateDelete<ClassroomDocumentEx>(
      route,
      { 'Jest-User': normalUser!._id },
      [
        {
          action: 'attachClassroom',
          data: { id: classroom._id.toString(), chatId: chat._id.toString(), sourceId: source._id.toString() },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                _id: chat._id.toString(),
                contents: [content._id.toString()],
              }),
            ],
          },
        },
      ],
      { overrideId: classroom._id.toString() },
    );

    // clean-up (as the documents are only partially formatted)
    await Promise.all([classroom.deleteOne(), source.deleteOne()]);
  });

  test('should pass when sharing homework to classroom', async () => {
    // create a classroom with assignment + homework
    const { assignment, classroom, homework, homeworkContents } = await genClassroomWithAssignment(
      tenantId!,
      normalUser!._id,
    );

    await Promise.all([classroom.save(), assignment.save(), homework.save(), Content.insertMany(homeworkContents)]);

    await createUpdateDelete<ClassroomDocumentEx>(
      route,
      { 'Jest-User': normalUser!._id },
      [
        {
          action: 'shareHomework',
          data: { id: classroom._id.toString(), sourceId: homework._id.toString() },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expect.any(String), expect.any(String), ...homeworkContents.map(c => c._id.toString())],
              }),
            ],
          },
        },
      ],
      { overrideId: classroom._id.toString() },
    );

    // clean-up (as the documents are only partially formatted)
    await Promise.all([classroom.deleteOne(), assignment.deleteOne(), homework.deleteOne()]);
  });

  test('should pass when sharing question to classroom', async () => {
    const { classroom } = await genClassroom(tenantId!, normalUser!._id); // create a classroom
    const { question, content } = genQuestion(tenantId!, normalUser!._id, {
      tutor: normalUser!._id,
      classroom: classroom._id,
    }); // create source question as tutor

    await Promise.all([classroom.save(), question.save(), content.save()]);

    await createUpdateDelete<ClassroomDocumentEx>(
      route,
      { 'Jest-User': normalUser!._id },
      [
        {
          action: 'shareQuestion',
          data: { id: classroom._id.toString(), sourceId: question._id.toString() },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expect.any(String), ...question.contents.map(c => c.toString())],
              }),
            ],
          },
        },
      ],
      { overrideId: classroom._id.toString() },
    );

    // clean-up (as the documents are only partially formatted)
    await Promise.all([classroom.deleteOne(), question.deleteOne()]);
  });

  test('should pass the full suite', async () => {
    expect.assertions(3 * (24 - 2));

    const [books, teacherLevel, tenant] = await Promise.all([
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
      Tenant.findById(tenantId!),
    ]);

    const { _id: book, subjects, level } = randomItem(books);
    const subject = randomItem(subjects);
    const schoolClass = `${level.toString().slice(-1)}-Y`;

    const newStudents = genClassroomUsers(tenantId!, tenant!.school!, level, schoolClass, 20);
    const newTeachers = genClassroomUsers(tenantId!, tenant!.school!, teacherLevel!._id, schoolClass, 3);
    await User.insertMany([...newStudents, ...newTeachers]);

    const [student0, student1, ...students] = newStudents;
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

    const flag = CHAT.MEMBER.FLAG.IMPORTANT;

    const classroom = await createUpdateDelete<ClassroomDocumentEx>(
      route,
      { 'Jest-User': tenantAdmin!._id },
      [
        {
          action: 'create', // tenantAdmin creates a new classroom
          data: { tenantId: tenantId!, ...create },
          expectedMinFormat: { ...expectedMinFormat, ...create, tenant: tenantId!, students: [], teachers: [] },
        },
        {
          action: 'updateTeachers', // tenantAdmin update teachers
          data: { userIds: [teacher0._id.toString()] },
          expectedMinFormat: { ...expectedMinFormat, students: [], teachers: [teacher0._id.toString()] },
        },
        {
          action: 'updateStudents', // tenantAdmin update teachers
          data: { userIds: students.map(s => s._id.toString()) },
          expectedMinFormat: { ...expectedMinFormat, students: students.map(s => s._id.toString()) },
        },
        {
          action: 'addRemark', // tenantAdmin adds remark
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(tenantAdmin!._id, FAKE) },
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
          action: 'updateTeachers', // teacher update teachers
          headers: { 'Jest-User': teacher0!._id },
          data: { userIds: teachers.map(t => t._id.toString()) },
          expectedMinFormat: {
            ...expectedMinFormat,
            teachers: [teacher0._id.toString(), ...teachers.map(t => t._id.toString())],
          },
        },
        {
          action: 'updateStudents', // teacher update students
          headers: { 'Jest-User': teacher0!._id },
          data: { userIds: [student0._id.toString(), student1._id.toString()] },
          expectedMinFormat: { ...expectedMinFormat, students: [student0._id.toString(), student1._id.toString()] },
        },
        { action: 'delete', data: {} }, // tenantAdmin remove classroom
        {
          action: 'recover', // tenantAdmin recover (un-delete) classroom
          data: prob(0.5) ? { remark: FAKE } : {},
          expectedMinFormat,
        },
        {
          action: 'update', // tenantAdmin or teacher update class
          headers: { 'Jest-User': prob(0.5) ? tenantAdmin!._id : teacher0!._id },
          data: { tenantId: tenantId!, ...update },
          expectedMinFormat: { ...expectedMinFormat, ...update },
        },
        { action: 'delete', headers: { 'Jest-User': teacher0!._id }, data: {} }, // teacher remove classroom
        {
          action: 'recover', // teacher recover (un-delete) classroom
          headers: { 'Jest-User': teacher0!._id },
          data: prob(0.5) ? { remark: FAKE } : {},
          expectedMinFormat,
        },
        {
          action: 'addContentWithNewChat', // teacher addContentWithNewChat
          headers: { 'Jest-User': teacher0!._id },
          data: { content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expect.any(String)],
                members: [expectedMember(teacher0._id, [])],
              }),
            ],
          },
        },
      ],
      { skipAssertion: true, skipDeleteCheck: true },
    );

    const classroomId = classroom!._id.toString();
    const chatId = classroom!.chats[0]._id.toString();

    const classroom2 = await createUpdateDelete<ClassroomDocumentEx>(
      route,
      { 'Jest-User': student0!._id },
      [
        {
          action: 'addContent', // student addContent
          data: { chatId, content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, contents: [expect.any(String), expect.any(String)] }),
            ],
          },
        },
        {
          action: 'addContentWithNewChat', // student addContentWithNewChat
          data: { content: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, contents: [expect.any(String), expect.any(String)] }),
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expect.any(String)],
                members: [expectedMember(student0._id, [])],
              }),
            ],
          },
        },
      ],
      { overrideId: classroomId, skipAssertion: true },
    );

    const contentIds = classroom2!.chats[0].contents;
    await createUpdateDelete<ClassroomDocumentEx>(
      route,
      { 'Jest-User': teacher0!._id },
      [
        {
          action: 'recallContent', // teacher recall first content of first chat (his owner content)
          data: { chatId, contentId: contentIds[0] },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, contents: [expect.any(String), expect.any(String)] }),
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expect.any(String)],
                members: [expectedMember(student0._id, [])],
              }),
            ],
          },
        },
        {
          action: 'blockContent', // teacher block second content of first chat (student's content)
          data: { chatId, contentId: contentIds[1] },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, contents: [expect.any(String), expect.any(String)] }),
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expect.any(String)],
                members: [expectedMember(student0._id, [])],
              }),
            ],
          },
        },
        {
          action: 'setChatFlag', // teacher set chat flag
          data: { chatId, flag },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                members: [expectedMember(teacher0._id, [flag]), expectedMember(student0._id, [])],
              }),
              expect.objectContaining(expectedChatFormat),
            ],
          },
        },
        {
          action: 'clearChatFlag', // teacher clear chat flag
          data: { chatId, flag },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                members: [expectedMember(teacher0._id, []), expectedMember(student0._id, [])],
              }),
              expect.objectContaining(expectedChatFormat),
            ],
          },
        },
        {
          action: 'updateChatLastViewedAt', // student updateChatLastViewedAt
          headers: { 'Jest-User': student0!._id },
          data: { chatId },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({
                ...expectedChatFormat,
                contents: [expect.any(String), expect.any(String)],
                members: [expectedMember(teacher0._id, []), expectedMember(student0._id, [])],
              }),
              expect.objectContaining({ ...expectedChatFormat, contents: [expect.any(String)] }),
            ],
          },
        },
        {
          action: 'updateChatTitle', // teacher updateChatTitle
          data: { chatId, title: FAKE },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [
              expect.objectContaining({ ...expectedChatFormat, title: FAKE }),
              expect.objectContaining(expectedChatFormat),
            ],
          },
        },
        {
          action: 'updateChatTitle', // teacher updateChatTitle
          data: { chatId },
          expectedMinFormat: {
            ...expectedMinFormat,
            chats: [expect.objectContaining(expectedChatFormat), expect.objectContaining(expectedChatFormat)],
          },
        },
      ],
      { overrideId: classroomId, skipAssertion: true },
    );

    // clean up
    await Promise.all([
      Classroom.deleteOne({ _id: classroom }),
      User.deleteMany({ _id: { $in: [...newStudents, ...newTeachers] } }),
    ]);
  });
});
