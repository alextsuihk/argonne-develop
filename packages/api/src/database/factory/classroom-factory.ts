/**
 * Factory: Classroom
 *
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import type { Types } from 'mongoose';

import type { AssignmentDocument } from '../../models/assignment';
import Assignment from '../../models/assignment';
import Book from '../../models/book';
import type { ChatDocument } from '../../models/chat';
import Chat from '../../models/chat';
import type { ClassroomDocument } from '../../models/classroom';
import Classroom from '../../models/classroom';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import type { HomeworkDocument } from '../../models/homework';
import Homework from '../../models/homework';
import SchoolCourse from '../../models/school-course';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { mongoId, prob, randomItem, randomItems, schoolYear } from '../../utils/helper';
import { fakeChatsWithContents, fakeContents } from '../helper';
import { findLevels } from '../seed/level-seed';

const { ASSIGNMENT, SCHOOL_COURSE, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * (helper) filter user based on school & level
 */
const selectUsers = (users: UserDocument[], school: Types.ObjectId, level: Types.ObjectId) =>
  users.filter(
    ({ schoolHistories }) =>
      schoolHistories[0] &&
      schoolHistories[0].year === schoolYear() &&
      schoolHistories[0].school.equals(school) &&
      schoolHistories[0].level.equals(level),
  );

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param chatMax: max chats (per classroom)
 * @param contentMax: max contents(per chat)
 * @param assignmentCount: max contents(per classroom)
 *
 */

const fake = async (codes: string[], chatMax = 3, contentMax = 5, assignmentCount = 5): Promise<string> => {
  const tenants = await Tenant.find({
    school: { $exists: true },
    services: TENANT.SERVICE.CLASSROOM,
    ...(codes.length && { code: { $in: codes } }),
    deletedAt: { $exists: false },
  }).lean();

  const [{ teacherLevel }, books, schoolCourses, users] = await Promise.all([
    findLevels(),
    Book.find({ deletedAt: { $exists: false } }).lean(),
    SchoolCourse.find({
      status: SCHOOL_COURSE.STATUS.PUBLISHED,
      school: { $in: tenants.map(t => t.school) },
      year: schoolYear(),
      deletedAt: { $exists: false },
    }).lean(),
    User.find({
      status: USER.STATUS.ACTIVE,
      tenants: { $in: tenants.map(t => t._id) },
      schoolHistories: { $ne: [] },
      deletedAt: { $exists: false },
    }).lean(),
  ]);

  const assignments: AssignmentDocument[] = [];
  const chats: ChatDocument[] = [];
  const contents: ContentDocument[] = [];
  const homeworks: HomeworkDocument[] = [];

  // helper function
  const fakeAssignmentsWithHomeworksAndContents = (
    classroomId: Types.ObjectId,
    bookIds: Types.ObjectId[],
    teachers: UserDocument[],
    students: UserDocument[],
  ) => {
    const homeworks: HomeworkDocument[] = [];
    const assignmentAndHomeworkContents: ContentDocument[] = [];

    const assignments = Array(assignmentCount)
      .fill(0)
      .map(() => {
        const assignmentId = mongoId();
        const isGraded = prob(0.5);
        const newHomeworks = students.map(student => {
          const homeworkId = mongoId();
          const homeworkContents = fakeContents(
            `/homeworks/${homeworkId}`,
            [student._id],
            Math.floor(Math.random() * 5 + (isGraded ? 1 : 0)), // range from 0 - 5 for not-graded, 1-6 for graded homework
            false,
          );
          assignmentAndHomeworkContents.push(...homeworkContents);

          const homeworkGradingContent = isGraded
            ? fakeContents(`/homeworks/${homeworkId}`, [randomItem(teachers)._id], 1, false)
            : [];
          assignmentAndHomeworkContents.push(...homeworkGradingContent);

          return new Homework<Partial<HomeworkDocument>>({
            _id: homeworkId,
            assignment: assignmentId,
            user: student._id,
            assignmentIdx: faker.number.int({ max: assignmentCount }),
            dynParamIdx: faker.number.int({ max: 5 }),
            contents: [...homeworkContents, ...homeworkGradingContent].map(c => c._id),
            ...(homeworkContents.length && {
              answer: faker.lorem.sentence(),
              answeredAt: faker.date.recent({ days: 2 }),
            }),
            ...(homeworkContents.length && prob(0.5) && { timeSpent: faker.number.int({ min: 5, max: 100 }) }),
            ...(prob(0.3) && { viewedExamples: [0, 2] }),
            ...(isGraded && { score: faker.number.int({ min: 50, max: 100 }) }),
          });
        });
        homeworks.push(...newHomeworks);

        const bookAssignmentIds = prob(0.5)
          ? randomItems(
              books
                .filter(b => bookIds.some(bookId => bookId.equals(b._id)))
                .map(book => book.assignments)
                .flat(),
              5,
            )
          : [];

        const manualAssignments = bookAssignmentIds.length
          ? []
          : Array(5)
              .fill(0)
              .map(() => faker.lorem.sentence());

        return new Assignment<Partial<AssignmentDocument>>({
          _id: assignmentId,
          flags: prob(0.2) ? [ASSIGNMENT.FLAG.QUIZ] : [],
          classroom: classroomId,
          ...(prob(0.5) && {
            chapter: `${faker.number.int({ min: 1, max: 10 })}#${faker.number.int({ min: 1, max: 20 })}`,
          }),
          ...(prob(0.5) && { title: `(assignment) ${faker.lorem.slug(2)}` }),

          deadline: faker.date.soon({ days: 15 }),
          bookAssignments: bookAssignmentIds,
          manualAssignments,

          homeworks: newHomeworks.map(h => h._id),
        });
      });

    return { assignments, homeworks, contents: assignmentAndHomeworkContents };
  };

  const classrooms = schoolCourses
    .map(({ school, year, courses }) => {
      const tenant = tenants.find(tenant => tenant.school!.equals(school))!;
      const teachers = selectUsers(users, school, teacherLevel._id);

      return courses
        .map(({ level, subjects }) => {
          const students = selectUsers(users, school, level);
          const schoolClasses = Array.from(new Set(students.map(student => student.schoolHistories[0]!.schoolClass!)));

          return schoolClasses
            .map(schoolClass =>
              subjects
                .map(({ _id: subject, books, alias }) => {
                  const classroomId = mongoId();

                  const selectedStudents = students.filter(s => s.schoolHistories[0]!.schoolClass === schoolClass);
                  const selectedTeachers = randomItems(teachers, prob(0.6) ? 1 : 2);

                  const { chats: newChats, contents: newChatContents } = fakeChatsWithContents(
                    `/classrooms/${classroomId}`,
                    [...selectedStudents, ...selectedTeachers].map(u => u._id),
                    chatMax,
                    contentMax,
                    true, // recallable contents
                  );

                  chats.push(...newChats);
                  contents.push(...newChatContents);

                  const {
                    assignments: newAssignments,
                    homeworks: newHomeworks,
                    contents: newAssignmentHomeworkContents,
                  } = fakeAssignmentsWithHomeworksAndContents(classroomId, books, selectedTeachers, selectedStudents);

                  assignments.push(...newAssignments);
                  homeworks.push(...newHomeworks);
                  contents.push(...newAssignmentHomeworkContents);

                  return new Classroom<Partial<ClassroomDocument>>({
                    _id: classroomId,
                    tenant: tenant._id,
                    level,
                    subject,
                    year,
                    schoolClass,
                    ...(prob(0.9) && {
                      title: alias ?? `${schoolClass} (${subject})`,
                    }),
                    ...(prob(0.5) && { room: faker.lorem.words(5) }),
                    ...(prob(0.5) && { schedule: faker.lorem.words(5) }),

                    books,
                    teachers: selectedTeachers.map(t => t._id),
                    students: selectedStudents.map(s => s._id),

                    chats: newChats.map(c => c._id),
                    assignments: newAssignments.map(a => a._id),
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
    Classroom.insertMany<Partial<ClassroomDocument>>(classrooms, { includeResultMetadata: true }),
    Assignment.insertMany<Partial<AssignmentDocument>>(assignments, { includeResultMetadata: true }),
    Chat.insertMany<Partial<ChatDocument>>(chats, { includeResultMetadata: true }),
    Content.insertMany<Partial<ContentDocument>>(contents, { includeResultMetadata: true }),
    Homework.insertMany<Partial<HomeworkDocument>>(homeworks, { includeResultMetadata: true }),
  ]);

  const msg = `${chalk.green(classrooms.length)} classrooms for ${chalk.green(schoolCourses.length)} school(s) created`;
  const assignmentMsg = `with ${chalk.green(assignments.length)} assignments`;
  const homeworkMsg = `with ${chalk.green(homeworks.length)} homeworks`;
  const chatMsg = `with ${chalk.green(chats.length)} chats`;
  const contentMsg = `with ${chalk.green(contents.length)} contents)`;
  return `(${msg}, ${chatMsg}, ${assignmentMsg}, ${homeworkMsg}, ${contentMsg})`;
};

export { fake };
