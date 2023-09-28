/**
 * Jest: /resolvers/classroom
 *
 */

import { LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
  expectedChatFormatApollo as expectedChatFormat,
  expectedDateFormat,
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
  testServer,
} from '../jest';
import Book from '../models/book';
import Classroom from '../models/classroom';
import Content from '../models/content';
import Level from '../models/level';
import Tenant from '../models/tenant';
import type { Id, UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_CLASSROOM,
  ADD_CLASSROOM_CONTENT,
  ADD_CLASSROOM_CONTENT_WITH_NEW_CHAT,
  ADD_CLASSROOM_REMARK,
  ATTACH_CHAT_GROUP_TO_CLASSROOM,
  ATTACH_CLASSROOM_TO_CLASSROOM,
  BLOCK_CLASSROOM_CONTENT,
  CLEAR_CLASSROOM_CHAT_FLAG,
  GET_CLASSROOM,
  GET_CLASSROOMS,
  RECALL_CLASSROOM_CONTENT,
  RECOVER_CLASSROOM,
  REMOVE_CLASSROOM,
  SET_CLASSROOM_CHAT_FLAG,
  SHARE_HOMEWORK_TO_CLASSROOM,
  SHARE_QUESTION_TO_CLASSROOM,
  UPDATE_CLASSROOM,
  UPDATE_CLASSROOM_CHAT_LAST_VIEWED_AT,
  UPDATE_CLASSROOM_CHAT_TITLE,
  UPDATE_CLASSROOM_STUDENTS,
  UPDATE_CLASSROOM_TEACHERS,
} from '../queries/classroom';
import { randomItem, schoolYear } from '../utils/helper';

const { MSG_ENUM } = LOCALE;
const { CHAT } = LOCALE.DB_ENUM;

// Top chat of this test suite:
describe('Classroom GraphQL', () => {
  let guestServer: ApolloServer | null;
  let normalServer: ApolloServer | null;
  let normalUser: (UserDocument & Id) | null;
  let tenantAdmin: (UserDocument & Id) | null;
  let tenantAdminServer: ApolloServer | null;
  let tenantId: string | null;

  const expectedFormat = {
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

    remarks: expect.any(Array), // could be empty array for non publisherAdmin or admin

    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),

    contentsToken: expect.any(String),
  };

  beforeAll(async () => {
    ({ guestServer, normalServer, normalUser, tenantAdmin, tenantAdminServer, tenantId } = await jestSetup(
      ['guest', 'normal', 'tenantAdmin'],
      { apollo: true },
    ));
  });

  afterAll(jestTeardown);

  test('should response an array of data when GET all & Get One (as student & teacher)', async () => {
    expect.assertions(4);

    const classrooms = await Classroom.find({
      tenant: tenantId!,
      students: { $ne: [] },
      teachers: { $ne: [] },
      deletedAt: { $exists: false },
    }).lean();

    const classroom = randomItem(classrooms);
    const studentId = randomItem(classroom.students);
    const teacherId = randomItem(classroom.teachers);

    const [student, teacher] = await Promise.all([
      User.findOneActive({ _id: studentId }),
      User.findOneActive({ _id: teacherId }),
    ]);

    if (!student || !teacher)
      throw `no valid student or teacher for testing ${classroom._id}, ${studentId}, ${teacherId}`;

    const studentServer = testServer(student);
    const teacherServer = testServer(teacher);

    // student
    const studentAllRes = await studentServer.executeOperation({ query: GET_CLASSROOMS });
    apolloExpect(studentAllRes, 'data', { classrooms: expect.arrayContaining([{ ...expectedFormat, remarks: [] }]) });

    const studentOneRes = await studentServer.executeOperation({
      query: GET_CLASSROOM,
      variables: { id: classroom._id.toString() },
    });
    apolloExpect(studentOneRes, 'data', { classroom: { ...expectedFormat, remarks: [] } });

    // teacher
    const teacherAllRes = await teacherServer.executeOperation({ query: GET_CLASSROOMS });
    apolloExpect(teacherAllRes, 'data', { classrooms: expect.arrayContaining([expectedFormat]) });

    const teacherOneRes = await teacherServer.executeOperation({
      query: GET_CLASSROOM,
      variables: { id: classroom._id.toString() },
    });
    apolloExpect(teacherOneRes, 'data', { classroom: expectedFormat });
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

  test('should pass when attaching chat from another chatGroup', async () => {
    expect.assertions(1);

    const { classroom } = await genClassroom(tenantId!, normalUser!._id);
    const { chatGroup: source, chat, content } = genChatGroup(tenantId!, normalUser!._id);
    await Promise.all([classroom.save(), source.save(), chat.save(), content.save()]);
    //! Note: at the point, classroom.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    const res = await normalServer!.executeOperation({
      query: ATTACH_CHAT_GROUP_TO_CLASSROOM,
      variables: { id: classroom._id.toString(), chatId: chat._id.toString(), sourceId: source._id.toString() },
    });

    apolloExpect(res, 'data', {
      attachChatGroupChatToClassroom: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, _id: chat._id.toString(), contents: [content._id.toString()] }],
      },
    });

    // clean-up (as the documents are only partially formatted)
    await Promise.all([classroom.deleteOne(), source.deleteOne()]);
  });

  test('should pass when attaching chat from another classroom', async () => {
    expect.assertions(1);

    const [{ classroom }, { classroom: source, chat, content }] = await Promise.all([
      genClassroom(tenantId!, normalUser!._id),
      genClassroom(tenantId!, normalUser!._id),
    ]);
    await Promise.all([classroom.save(), source.save(), chat.save(), content.save()]);
    //! Note: at the point, classroom.chats have one value, BUT "the chat" is NOT saved, therefore, it will disappear AFTER populating

    const res = await normalServer!.executeOperation({
      query: ATTACH_CLASSROOM_TO_CLASSROOM,
      variables: { id: classroom._id.toString(), chatId: chat._id.toString(), sourceId: source._id.toString() },
    });

    apolloExpect(res, 'data', {
      attachClassroomChatToClassroom: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, _id: chat._id.toString(), contents: [content._id.toString()] }],
      },
    });

    await Promise.all([classroom.deleteOne(), source.deleteOne()]);
  });

  test('should pass when sharing homework to classroom', async () => {
    expect.assertions(1);

    // create a classroom with assignment + homework
    const { assignment, classroom, homework, homeworkContents } = await genClassroomWithAssignment(
      tenantId!,
      normalUser!._id,
    );

    await Promise.all([classroom.save(), assignment.save(), homework.save(), Content.insertMany(homeworkContents)]);

    const res = await normalServer!.executeOperation({
      query: SHARE_HOMEWORK_TO_CLASSROOM,
      variables: { id: classroom._id.toString(), sourceId: homework._id.toString() },
    });

    apolloExpect(res, 'data', {
      shareHomeworkToClassroom: {
        ...expectedFormat,
        chats: [
          {
            ...expectedChatFormat,
            contents: [expect.any(String), expect.any(String), ...homeworkContents.map(c => c._id.toString())],
          },
        ],
      },
    });

    // clean-up (as the documents are only partially formatted)
    await Promise.all([classroom.deleteOne(), assignment.deleteOne(), homework.deleteOne()]);
  });

  test('should pass when sharing question to classroom', async () => {
    expect.assertions(1);

    const { classroom } = await genClassroom(tenantId!, normalUser!._id); // create a classroom
    const { question, content } = genQuestion(tenantId!, normalUser!._id, classroom._id, 'tutor'); // create source question as tutor
    await Promise.all([classroom.save(), question.save(), content.save()]);

    const res = await normalServer!.executeOperation({
      query: SHARE_QUESTION_TO_CLASSROOM,
      variables: { id: classroom._id.toString(), sourceId: question._id.toString() },
    });
    apolloExpect(res, 'data', {
      shareQuestionToClassroom: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, contents: [expect.any(String), ...question.contents.map(c => c.toString())] }],
      },
    });

    await Promise.all([classroom.deleteOne(), question.deleteOne()]);
  });

  test('should pass the full suite', async () => {
    expect.assertions(22);
    const [books, teacherLevel, tenant] = await Promise.all([
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
      Tenant.findById(tenantId!),
    ]);

    const { _id: book, subjects, level } = randomItem(books);
    const subject = randomItem(subjects);
    const schoolClass = `${level.toString().slice(-1)}-X`;

    const newStudents = genClassroomUsers(tenantId!, tenant!.school!, level, schoolClass, 30);
    const newTeachers = genClassroomUsers(tenantId!, tenant!.school!, teacherLevel!._id, schoolClass, 3);
    await User.insertMany([...newStudents, ...newTeachers]);

    const [student0, student1, ...students] = newStudents;
    const [teacher0, ...teachers] = newTeachers;

    const student0Id = student0._id.toString();
    const student1Id = student1._id.toString();
    const teacher0Id = teacher0._id.toString();

    const teacher0Server = testServer(teacher0);
    const student0Server = testServer(student0);

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
      addClassroom: { ...expectedFormat, ...create, tenant: tenantId!, students: [], teachers: [] },
    });
    const newId: string = createdRes.data!.addClassroom._id;

    // tenantAdmin update teachers
    const updateTeachersRes = await tenantAdminServer!.executeOperation({
      query: UPDATE_CLASSROOM_TEACHERS,
      variables: { id: newId, userIds: [teacher0Id] },
    });
    apolloExpect(updateTeachersRes, 'data', {
      updateClassroomTeachers: { ...expectedFormat, students: [], teachers: [teacher0Id] },
    });

    // tenantAdmin update students
    const updateStudentsRes = await tenantAdminServer!.executeOperation({
      query: UPDATE_CLASSROOM_STUDENTS,
      variables: { id: newId, userIds: students.map(s => s._id.toString()) },
    });
    apolloExpect(updateStudentsRes, 'data', {
      updateClassroomStudents: { ...expectedFormat, students: students.map(s => s._id.toString()) },
    });

    // tenantAdmin addRemark
    const addRemarkRes = await tenantAdminServer!.executeOperation({
      query: ADD_CLASSROOM_REMARK,
      variables: { id: newId, remark: FAKE },
    });

    apolloExpect(addRemarkRes, 'data', {
      addClassroomRemark: { ...expectedFormat, ...expectedRemark(tenantAdmin!._id, FAKE, true) },
    });

    // teacher addRemark
    const addRemark2Res = await teacher0Server.executeOperation({
      query: ADD_CLASSROOM_REMARK,
      variables: { id: newId, remark: FAKE },
    });
    apolloExpect(addRemark2Res, 'data', {
      addClassroomRemark: {
        ...expectedFormat,
        ...expectedRemark(teacher0!._id, FAKE, true),
        remarks: [
          { t: expect.any(Number), u: expect.any(String), m: FAKE }, // first addRemark by tenantAdmin
          { t: expect.any(Number), u: teacher0!._id.toString(), m: FAKE }, //
        ],
      },
    });

    // teacher update teachers
    const updateTeachers2Res = await teacher0Server.executeOperation({
      query: UPDATE_CLASSROOM_TEACHERS,
      variables: { id: newId, userIds: teachers.map(t => t._id.toString()) },
    });
    apolloExpect(updateTeachers2Res, 'data', {
      updateClassroomTeachers: { ...expectedFormat, teachers: [teacher0Id, ...teachers.map(t => t._id.toString())] },
    });

    // teacher update students
    const updateStudents2Res = await teacher0Server.executeOperation({
      query: UPDATE_CLASSROOM_STUDENTS,
      variables: { id: newId, userIds: [student0Id, student1Id] },
    });
    apolloExpect(updateStudents2Res, 'data', {
      updateClassroomStudents: { ...expectedFormat, students: [student0Id, student1Id] },
    });

    // tenantAdmin remove classroom
    const removedRes = await tenantAdminServer!.executeOperation({
      query: REMOVE_CLASSROOM,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeClassroom: { code: MSG_ENUM.COMPLETED } });

    // tenantAdmin recover (un-delete) classroom
    const recoverRes = await tenantAdminServer!.executeOperation({
      query: RECOVER_CLASSROOM,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(recoverRes, 'data', { recoverClassroom: expectedFormat });

    // tenantAdmin or teacher update classroom
    const server = prob(0.5) ? tenantAdminServer! : teacher0Server;
    const updatedRes = await server.executeOperation({
      query: UPDATE_CLASSROOM,
      variables: { id: newId, ...update },
    });
    apolloExpect(updatedRes, 'data', {
      updateClassroom: { ...expectedFormat, ...update },
    });

    // teacher remove classroom
    const removedRes2 = await teacher0Server.executeOperation({
      query: REMOVE_CLASSROOM,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes2, 'data', { removeClassroom: { code: MSG_ENUM.COMPLETED } });

    // teacher recover (un-delete) classroom
    const recoverRes2 = await teacher0Server.executeOperation({
      query: RECOVER_CLASSROOM,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(recoverRes2, 'data', { recoverClassroom: expectedFormat });

    // (teacher) addContentWithNewChat
    const addContentWithNewChatRes = await teacher0Server.executeOperation({
      query: ADD_CLASSROOM_CONTENT_WITH_NEW_CHAT,
      variables: { id: newId, content: FAKE },
    });
    apolloExpect(addContentWithNewChatRes, 'data', {
      addClassroomContentWithNewChat: {
        ...expectedFormat,
        chats: [
          { ...expectedChatFormat, contents: [expect.any(String)], members: [expectedMember(teacher0Id, [], true)] },
        ],
      },
    });
    const chatId = addContentWithNewChatRes.data!.addClassroomContentWithNewChat.chats[0]._id.toString();

    // (student) addContent (append to first chat)
    const addContentRes = await student0Server.executeOperation({
      query: ADD_CLASSROOM_CONTENT,
      variables: { id: newId, chatId, content: FAKE },
    });
    apolloExpect(addContentRes, 'data', {
      addClassroomContent: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, contents: [expect.any(String), expect.any(String)] }],
      },
    });
    const contentIds = addContentRes.data?.addClassroomContent.chats[0].contents;

    // (student) addContentWithNewChat
    const addContentWithNewChatRes2 = await student0Server.executeOperation({
      query: ADD_CLASSROOM_CONTENT_WITH_NEW_CHAT,
      variables: { id: newId, content: FAKE },
    });
    apolloExpect(addContentWithNewChatRes2, 'data', {
      addClassroomContentWithNewChat: {
        ...expectedFormat,
        chats: [
          { ...expectedChatFormat, contents: [expect.any(String), expect.any(String)] },
          { ...expectedChatFormat, contents: [expect.any(String)], members: [expectedMember(student0Id, [], true)] },
        ],
      },
    });

    // (teacher) recall first content of first chat (his owner content)
    const recallContentRes = await teacher0Server.executeOperation({
      query: RECALL_CLASSROOM_CONTENT,
      variables: { id: newId, chatId, contentId: contentIds[0] },
    });
    apolloExpect(recallContentRes, 'data', {
      recallClassroomContent: expectedFormat, // recallContent() only update classroom.updatedAt
    });

    // (teacher) block second content of first chat (student's content)
    const blockContentRes = await teacher0Server.executeOperation({
      query: BLOCK_CLASSROOM_CONTENT,
      variables: { id: newId, chatId, contentId: contentIds[1] },
    });
    apolloExpect(blockContentRes, 'data', {
      blockClassroomContent: expectedFormat, // blockContent() only update classroom.updatedAt
    });

    // (teacher) set chat flag
    const flag = CHAT.MEMBER.FLAG.IMPORTANT;
    const setChatFlagRes = await teacher0Server.executeOperation({
      query: SET_CLASSROOM_CHAT_FLAG,
      variables: { id: newId, chatId, flag },
    });

    apolloExpect(setChatFlagRes, 'data', {
      setClassroomChatFlag: {
        ...expectedFormat,
        chats: [
          {
            ...expectedChatFormat,
            members: [expectedMember(teacher0Id, [flag], true), expectedMember(student0Id, [], true)],
          },
          expectedChatFormat,
        ],
      },
    });

    // (teacher) clear chat flag
    const clearChatFlagRes = await teacher0Server.executeOperation({
      query: CLEAR_CLASSROOM_CHAT_FLAG,
      variables: { id: newId, chatId, flag },
    });
    apolloExpect(clearChatFlagRes, 'data', {
      clearClassroomChatFlag: {
        ...expectedFormat,
        chats: [
          {
            ...expectedChatFormat,
            members: [expectedMember(teacher0Id, [], true), expectedMember(student0Id, [], true)],
          },
          expectedChatFormat,
        ],
      },
    });

    // (student) update chat lastViewedAt
    const updateLatViewedAtRes = await student0Server.executeOperation({
      query: UPDATE_CLASSROOM_CHAT_LAST_VIEWED_AT,
      variables: { id: newId, chatId },
    });
    apolloExpect(updateLatViewedAtRes, 'data', {
      updateClassroomChatLastViewedAt: {
        ...expectedFormat,
        chats: [
          {
            ...expectedChatFormat,
            contents: [expect.any(String), expect.any(String)],
            members: [expectedMember(teacher0Id, [], true), expectedMember(student0Id, [], true)],
          },
          { ...expectedChatFormat, contents: [expect.any(String)] },
        ],
      },
    });

    // (teacher) set chat title
    const updateChatTitleRes = await teacher0Server.executeOperation({
      query: UPDATE_CLASSROOM_CHAT_TITLE,
      variables: { id: newId, chatId, title: FAKE },
    });
    apolloExpect(updateChatTitleRes, 'data', {
      updateClassroomChatTitle: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, title: FAKE }, expectedChatFormat],
      },
    });

    // (teacher) unset chat title
    const updateChatTitleRes2 = await teacher0Server.executeOperation({
      query: UPDATE_CLASSROOM_CHAT_TITLE,
      variables: { id: newId, chatId },
    });
    apolloExpect(updateChatTitleRes2, 'data', {
      updateClassroomChatTitle: {
        ...expectedFormat,
        chats: [{ ...expectedChatFormat, title: null }, expectedChatFormat],
      },
    });

    // clean up
    await Promise.all([
      Classroom.deleteOne({ _id: newId }),
      User.deleteMany({ _id: { $in: [...newStudents, ...newTeachers] } }),
    ]);
  });
});
