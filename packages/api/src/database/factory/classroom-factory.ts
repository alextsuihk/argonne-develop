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
import type { ClassroomDocument, Id } from '../../models/classroom';
import Classroom from '../../models/classroom';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import type { HomeworkDocument } from '../../models/homework';
import Homework from '../../models/homework';
import SchoolCourse from '../../models/school-course';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { idsToString, mongoId, prob, schoolYear, shuffle } from '../../utils/helper';
import { fakeChatsWithContents, fakeContents } from '../helper';
import { findLevels } from '../seed/level-seed';

const { ASSIGNMENT, SCHOOL_COURSE, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * (helper) filter user based on school & level
 */
const selectUsers = (users: (UserDocument & Id)[], school: string | Types.ObjectId, level: string | Types.ObjectId) =>
  users.filter(
    ({ schoolHistories }) =>
      schoolHistories[0] &&
      schoolHistories[0].year === schoolYear() &&
      schoolHistories[0].school.toString() === school.toString() &&
      schoolHistories[0].level.toString() === level.toString(),
  );

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param count: per level per tenant
 * @param chatMax: max chats (per classroom)
 * @param contentMax: max contents(per chat)
 * @param assignmentCount: max contents(per classroom)
 *
 */

const fake = async (codes: string[], count: 2, chatMax = 3, contentMax = 5, assignmentCount = 5): Promise<string> => {
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

    User.find({ status: USER.STATUS.ACTIVE, schoolHistories: { $ne: [] }, deletedAt: { $exists: false } }).lean(),
  ]);

  const assignments: (AssignmentDocument & Id)[] = [];
  const chats: (ChatDocument & Id)[] = [];
  const contents: (ContentDocument & Id)[] = [];
  const homeworks: (HomeworkDocument & Id)[] = [];

  // helper function
  const fakeAssignmentsWithHomeworksAndContents = (
    classroomId: string | Types.ObjectId,
    bookIds: (string | Types.ObjectId)[],
    teachers: (UserDocument & Id)[],
    students: (UserDocument & Id)[],
  ) => {
    const homeworks: (HomeworkDocument & Id)[] = [];
    const aContents: (ContentDocument & Id)[] = [];

    const assignments = Array(assignmentCount)
      .fill(0)
      .map(_ => {
        const assignmentId = mongoId();
        const newHomeworks = students.map(student => {
          const homeworkId = mongoId();
          const homeworkContents = fakeContents(
            'homeworks',
            homeworkId,
            [student._id],
            Math.floor(Math.random() * 5), // range from 0 - 5
            false,
          );
          aContents.push(...homeworkContents);

          return new Homework<Partial<HomeworkDocument & Id>>({
            _id: homeworkId,
            user: student._id,
            assignmentIdx: faker.datatype.number(assignmentCount),
            dynParamIdx: faker.datatype.number(5),
            contents: idsToString(homeworkContents),
            ...(homeworkContents.length && { answer: faker.lorem.sentence(), answeredAt: faker.date.recent(2) }),
            ...(homeworkContents.length && prob(0.5) && { timeSpent: faker.datatype.number(100) }),
            ...(prob(0.3) && { viewedExamples: [0, 2] }),
            ...(homeworkContents.length && prob(0.5) && { score: faker.datatype.number({ min: 50, max: 100 }) }),
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
          : fakeContents('assignments', assignmentId, [teachers[0]!._id], Math.ceil(Math.random() * 5));
        aContents.push(...newManualAssignments);

        return new Assignment<Partial<AssignmentDocument & Id>>({
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

    return { assignments, homeworks, contents: aContents };
  };

  const classrooms = schoolCourses
    .map(({ school, year, courses }) => {
      const tenant = tenants.find(tenant => tenant.school!.toString() === school.toString())!;
      const teachers = selectUsers(users, school, teacherLevel._id);

      return courses
        .map(({ level, subjects }) => {
          const students = selectUsers(users, school, level);
          const schoolClasses = Array.from(new Set(students.map(student => student.schoolHistories[0]!.schoolClass!)));

          return schoolClasses
            .map(schoolClass =>
              subjects
                .map(({ subject, books, alias }) =>
                  Array(count)
                    .fill(0)
                    .map(() => {
                      const classroomId = mongoId();

                      const selectedStudents = students.filter(s => s.schoolHistories[0]!.schoolClass === schoolClass);
                      const selectedTeachers = teachers.sort(shuffle).slice(0, prob(0.6) ? 1 : 2);

                      const { chats: newChats, contents: newChatContents } = fakeChatsWithContents(
                        'classrooms',
                        classroomId,
                        idsToString([...selectedStudents, ...selectedTeachers]),
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
                      } = fakeAssignmentsWithHomeworksAndContents(
                        classroomId,
                        books,
                        selectedTeachers,
                        selectedStudents,
                      );

                      assignments.push(...newAssignments);
                      homeworks.push(...newHomeworks);
                      contents.push(...newAssignmentHomeworkContents);

                      return new Classroom<Partial<ClassroomDocument & Id>>({
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
                        teachers: idsToString(selectedTeachers),
                        students: idsToString(selectedStudents),

                        chats: idsToString(newChats),
                        assignments: idsToString(newAssignments),
                      });
                    })
                    .flat(),
                )
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

  const msg = `${chalk.green(classrooms.length)} classrooms [for ${schoolCourses.length} school(s)] created`;
  const chatMsg = `with ${chalk.green(chats.length)} chats`;
  const assignmentMsg = `${chalk.green(assignments.length)} assignments`;
  const homeworkMsg = `with ${chalk.green(homeworks.length)} homeworks`;
  const contentMSg = `chats, ${chalk.green(contents.length)} contents)`;
  return `(${msg}, ${chatMsg}, ${assignmentMsg}, ${homeworkMsg}, ${contentMSg})`;
};

export { fake };
