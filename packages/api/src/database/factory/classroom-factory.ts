/**
 * Factory: Classroom
 *
 * !Note: it also update user.history.schoolClass
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import type { LeanDocument, Types } from 'mongoose';
import mongoose from 'mongoose';

import type { AssignmentDocument, HomeworkDocument } from '../../models/assignment';
import Assignment, { Homework } from '../../models/assignment';
import Book from '../../models/book';
import type { ChatDocument } from '../../models/chat';
import Chat from '../../models/chat';
import type { ClassroomDocument } from '../../models/classroom';
import Classroom from '../../models/classroom';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import SchoolCourse from '../../models/school-course';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { idsToString, prob, schoolYear, shuffle } from '../../utils/helper';
import { findLevels } from '../seed/level-seed';
import { fakeContents } from './helper';

const { ASSIGNMENT, CHAT, SCHOOL_COURSE, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 * @param count: per level per tenant
 * @param chatMax: max chats (per classroom)
 * @param contentMax: max contents(per chat)
 * @param assignmentCount: max contents(per classroom)
 *
 */

const fake = async (count: 2, chatMax = 3, contentMax = 5, assignmentCount = 5): Promise<string> => {
  const SCHOOL_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const deletedAt = { deletedAt: { $exists: false } };
  const [{ teacherLevel, primaryLevels, juniorLevels, seniorLevels }, books, schoolCourses, tenants, users] =
    await Promise.all([
      findLevels(),
      Book.find(deletedAt).lean(),
      SchoolCourse.find({ status: SCHOOL_COURSE.STATUS.PUBLISHED, year: schoolYear(), ...deletedAt }).lean(),
      Tenant.find({ school: { $exists: true }, services: TENANT.SERVICE.CLASSROOM, ...deletedAt }).lean(),
      User.find({ status: USER.STATUS.ACTIVE }).lean(),
    ]);

  const assignments: AssignmentDocument[] = [];
  const chats: ChatDocument[] = [];
  const contents: ContentDocument[] = [];
  const homeworks: HomeworkDocument[] = [];

  // helper function
  const fakeAssignments = (
    classroomId: string | Types.ObjectId,
    bookIds: (string | Types.ObjectId)[],
    teachers: LeanDocument<UserDocument>[],
    students: LeanDocument<UserDocument>[],
  ) =>
    Array(assignmentCount)
      .fill(0)
      .map(_ => {
        const assignmentId = new mongoose.Types.ObjectId();
        const newHomeworks = students.map(student => {
          const homeworkId = new mongoose.Types.ObjectId();

          const newContents = fakeContents(homeworkId, [student._id], Math.floor(Math.random() * 5), false);
          contents.push(...newContents);

          return new Homework<Partial<HomeworkDocument>>({
            _id: homeworkId,
            user: student._id,
            assignmentIdx: faker.datatype.number(assignmentCount),
            dynParamIdx: faker.datatype.number(5),
            contents: idsToString(contents),
            ...(newContents.length && { answer: faker.lorem.sentence(), answeredAt: faker.date.recent(2) }),
            ...(newContents.length && prob(0.5) && { timeSpent: faker.datatype.number(100) }),
            ...(prob(0.3) && { viewedExamples: [0, 2] }),
            ...(newContents.length && prob(0.5) && { score: faker.datatype.number({ min: 50, max: 100 }) }),
          });
        });
        homeworks.push(...newHomeworks);

        const bookAssignmentIds = prob(0.5)
          ? books
              .filter(x => idsToString(bookIds).includes(x._id.toString()))
              .map(b => idsToString(b.assignments))
              .flat()
              .sort(shuffle)
              .slice(0, 5)
          : [];

        const newManualAssignments = bookAssignmentIds.length
          ? []
          : fakeContents(assignmentId, [teachers[0]!._id], Math.ceil(Math.random() * 5));
        if (newManualAssignments.length) contents.push(...newManualAssignments);

        return new Assignment<Partial<AssignmentDocument>>({
          _id: assignmentId,
          flags: prob(0.2) ? [ASSIGNMENT.FLAG.QUIZ] : [],
          classroom: classroomId,
          ...(prob(0.5) && { chapter: `${faker.datatype.number(10)}#${faker.datatype.number(20)}` }),
          ...(prob(0.5) && { title: `(assignment) ${faker.lorem.slug(2)}` }),

          deadline: faker.date.soon(15),
          bookAssignments: bookAssignmentIds,
          manualAssignments: idsToString(newManualAssignments),

          homeworks: idsToString(newHomeworks),
        });
      });

  // helper function
  const fakeChats = (classroomId: string | Types.ObjectId, users: LeanDocument<UserDocument>[]) =>
    Array(Math.ceil(Math.random() * chatMax))
      .fill(0)
      .map(_ => {
        const chatId = new mongoose.Types.ObjectId();
        const newContents = fakeContents(chatId, idsToString(users), Math.ceil(Math.random() * contentMax));
        contents.push(...newContents);

        return new Chat<Partial<ChatDocument>>({
          _id: chatId,
          ...(prob(0.5) && { title: `chat-title: ${faker.lorem.slug(10)}` }),
          parents: [`/classrooms/${classroomId}`],
          members: users
            .sort(shuffle)
            .slice(0, 3)
            .map(user => ({
              user: user._id,
              flags: prob(0.3) ? [CHAT.MEMBER.FLAG.IMPORTANT] : [],
              lastViewedAt: faker.date.recent(1),
            })),
          contents: newContents.map(content => content._id),
        });
      });

  const classrooms = schoolCourses
    .map(({ school, year, courses }) => {
      const tenant = tenants.find(tenant => tenant.school?.toString() === school.toString());
      if (!tenant) throw `school (${school}) does not have a tenant !, improperly configured`;

      const teachers = users.filter(
        ({ histories }) =>
          histories[0] &&
          histories[0].year === schoolYear() &&
          histories[0].school.toString() === school.toString() &&
          histories[0].level.toString() === teacherLevel._id.toString(),
      );

      const students = users.filter(
        ({ histories }) =>
          histories[0] &&
          histories[0].year === schoolYear() &&
          histories[0].school.toString() === school.toString() &&
          idsToString([...primaryLevels, ...juniorLevels, ...seniorLevels]).includes(histories[0].level.toString()),
      );

      // update student's schoolClass
      students.forEach(({ histories }, idx) => {
        const { level } = histories[0]!;
        const levelCode = [...primaryLevels, ...juniorLevels, ...seniorLevels].find(
          l => l._id.toString() === level.toString(),
        )!.code;

        histories[0]!.schoolClass = `${levelCode.slice(-1)}-${SCHOOL_CLASSES[idx % count]}`;
      });

      return courses
        .map(({ level, subjects }) => {
          const levelCode = [...primaryLevels, ...juniorLevels, ...seniorLevels].find(
            l => l._id.toString() === level.toString(),
          )!.code;

          return subjects
            .map(({ subject, books, alias }) =>
              Array(count)
                .fill(0)
                .map((_, idx) => {
                  const classroomId = new mongoose.Types.ObjectId();

                  const schoolClass = `${levelCode.slice(-1)}-${SCHOOL_CLASSES[idx % count]}`;
                  const selectedStudents = students.filter(s => s.histories[0]?.schoolClass === schoolClass);
                  const selectedTeachers = teachers.filter((_, i) => i % count === idx);

                  const newChats = fakeChats(classroomId, [...teachers, ...selectedStudents]);
                  chats.push(...newChats);

                  const newAssignments = fakeAssignments(classroomId, books, selectedTeachers, selectedStudents);
                  assignments.push(...newAssignments);

                  return new Classroom<Partial<ClassroomDocument>>({
                    _id: classroomId,
                    tenant: tenant._id,
                    level,
                    subject,
                    year,
                    schoolClass,
                    ...(prob(0.9) && {
                      title: alias ?? `${levelCode.slice(-1)}-${SCHOOL_CLASSES[idx % count]} (${subject})`,
                    }),
                    ...(prob(0.5) && { room: faker.lorem.words(5) }),
                    ...(prob(0.5) && { schedule: faker.lorem.words(5) }),

                    books,
                    teachers: idsToString(selectedTeachers),
                    students: idsToString(selectedStudents),

                    chats: idsToString(newChats),
                    assignments: idsToString(newAssignments),
                  });
                })
                .flat(),
            )
            .flat();
        })
        .flat();
    })
    .flat();

  await Promise.all([
    Classroom.create(classrooms),
    Assignment.create(assignments),
    Chat.create(chats),
    Content.create(contents),
    Homework.create(homeworks),
  ]);

  console.log('classroom-factory', assignments.length, chats.length, contents.length, homeworks.length);
  return `(${chalk.green(classrooms.length)} classrooms [for ${schoolCourses.length} school(s)] created)`;
};

export { fake };
