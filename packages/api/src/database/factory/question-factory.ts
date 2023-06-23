/**
 * Factory: Question
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import Book from '../../models/book';
import Classroom from '../../models/classroom';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import type { QuestionDocument } from '../../models/question';
import Question from '../../models/question';
import Subject from '../../models/subject';
import Tenant from '../../models/tenant';
import Tutor from '../../models/tutor';
import User from '../../models/user';
import { idsToString, mongoId, prob, schoolYear, shuffle } from '../../utils/helper';
import { fakeContents } from '../helper';
import { findLevels } from '../seed/level-seed';

const { CHAT, QUESTION, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param questionCount
 * @param contentCount
 * @param bidCount
 * @returns
 */
const fake = async (
  codes: string[],
  questionCount = 5, // per user (per tenant)
  contentCount = 6, // contents count per question
  bidCount = 5,
): Promise<string> => {
  const [{ primaryLevels, juniorLevels, seniorLevels }, books, classrooms, subjects, tenants, tutors, users] =
    await Promise.all([
      findLevels(),
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Classroom.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
      Tenant.find({
        services: { $in: [TENANT.SERVICE.CLASSROOM, TENANT.SERVICE.QUESTION] },
        ...(codes.length && { code: { $in: codes } }),
        deletedAt: { $exists: false },
      }).lean(),
      Tutor.find({ deletedAt: { $exists: false } }).lean(),
      User.find({ status: USER.STATUS.ACTIVE }).lean(),
    ]);

  const contents: ContentDocument[] = [];

  const students = users.filter(
    user =>
      user.schoolHistories[0] &&
      idsToString([...primaryLevels, ...juniorLevels, ...seniorLevels]).includes(
        user.schoolHistories[0].level.toString(),
      ),
  );

  const questions = tenants
    .map(tenant => {
      const students = users
        .sort(shuffle)
        .filter(
          user =>
            idsToString(user.tenants).includes(tenant._id.toString()) &&
            user.schoolHistories[0] &&
            user.schoolHistories[0].year === schoolYear() &&
            idsToString([...primaryLevels, ...juniorLevels, ...seniorLevels]).includes(
              user.schoolHistories[0].level.toString(),
            ),
        );

      return students
        .slice(0, Math.round(students.length * 0.5)) // 50% students post questions
        .map(student =>
          Array(questionCount)
            .fill(0)
            .map(_ => {
              const levelId = student.schoolHistories[0]!.level.toString();
              const subjectId = subjects
                .sort(shuffle)
                .find(subject => idsToString(subject.levels).includes(levelId))!
                ._id.toString();

              // classroom could be in another tenant
              const classroom = classrooms.find(
                classroom =>
                  idsToString(classroom.students).includes(student._id.toString()) &&
                  classroom.subject.toString() === subjectId &&
                  classroom.level.toString() === levelId,
              );
              const book =
                classroom && books.find(b => idsToString(classroom.books).find(cBook => cBook == b._id.toString()));

              const tutorTenantUserIds =
                classroom && tenant.services.includes(TENANT.SERVICE.CLASSROOM) // chose this logic because JEST tenant has CLASSROOM & TUTOR
                  ? idsToString(classroom.teachers) // for school (with classroom), raise question to teacher(s)
                  : tenant.services.includes(TENANT.SERVICE.TUTOR)
                  ? tutors
                      .filter(
                        tutor =>
                          tutor.tenant.toString() === tenant._id.toString() &&
                          tutor.specialties.some(
                            ({ level, subject }) => level.toString() === levelId && subject.toString() == subjectId,
                          ),
                      )
                      .slice(0, bidCount)
                      .map(tutor => tutor.user.toString())
                  : [];

              const isBidding = !!tutorTenantUserIds.length && prob(0.3); // not possible to bid if there is no potential tutors

              const tutorUserIds =
                classroom && tenant.services.includes(TENANT.SERVICE.CLASSROOM)
                  ? [...tutorTenantUserIds, ...idsToString(classroom.teachers)].sort(shuffle) // for school-tenant, ask classroom teachers
                  : tutorTenantUserIds.sort(shuffle);

              if (!tutorUserIds.length) return null; // cannot do anything if there is tutor (this is not an error, just no matching)

              const questionId = mongoId();

              // generate contents ONLY if there are tutors
              const newContents = Array(Math.max(1, contentCount))
                .fill(0)
                .map((_, idx) =>
                  fakeContents(
                    'question',
                    questionId,
                    tutorUserIds[0] && idx % 2 ? [tutorUserIds[0]] : [student._id],
                    1,
                  ),
                )
                .flat();
              contents.push(...newContents);

              // generate bidMessages[][]
              const bidContents = isBidding
                ? tutorUserIds.map(userId =>
                    Array(Math.ceil(Math.random() * 3 + 1))
                      .fill(0)
                      .map((_, idx) => fakeContents('question', questionId, idx % 2 ? [student._id] : [userId], 1))
                      .flat(),
                  )
                : [];
              contents.push(...bidContents.flat());

              const bookRev = book?.revisions.sort(shuffle)[0]?.rev;
              return tutorUserIds.length
                ? new Question<Partial<QuestionDocument>>({
                    ...(student.flags.includes(USER.FLAG.EDA) && { flags: [QUESTION.FLAG.EDA] }),
                    tenant: tenant._id,
                    student: student._id,
                    ...((!isBidding || (isBidding && prob(0.5))) && { tutor: tutorUserIds[0] }),

                    members: [student._id, ...tutorUserIds]
                      .sort(shuffle)
                      .slice(0, 3)
                      .map(user => ({
                        user,
                        flags: prob(0.3) ? [CHAT.MEMBER.FLAG.IMPORTANT] : [],
                        lastViewedAt: faker.date.recent(1),
                      })),

                    deadline: faker.date.soon(7),
                    ...(classroom && { classroom: classroom._id }),
                    level: levelId,
                    subject: subjectId,
                    ...(book && { book: book._id }),
                    ...(bookRev && { bookRev }),
                    ...(bookRev &&
                      prob(0.8) && { chapter: `${faker.datatype.number(10)}#${faker.datatype.number(30)}` }),

                    // assignment
                    // assignmentIdx
                    // homework

                    lang: Object.keys(QUESTION.LANG).sort(shuffle)[0],

                    contents: idsToString(newContents),
                    ...(!isBidding && { contents: idsToString(newContents) }),

                    ...(!isBidding && prob(0.8) && { timeSpent: faker.datatype.number(60) }),

                    // extra
                    ...(prob(0.5) && { price: faker.datatype.number(10) * 1000 }),
                    ...(isBidding && {
                      bidders: tutorUserIds,
                      bidContents: bidContents.map(b => idsToString(b)),
                    }),
                    ...(!isBidding && prob(0.5) && { paidAt: faker.date.soon(7) }),
                  })
                : null;
            })
            .flat(),
        )
        .flat();
    })
    .flat()
    .filter(question => !!question); // remove null

  await Promise.all([Content.create(contents), Question.create(questions)]);
  return `(${chalk.green(questions.length)} questions [for ${tenants.length} tenant(s)] (with ${
    contents.length
  } contents) for ${students.length} students created)`;
};

export { fake };
