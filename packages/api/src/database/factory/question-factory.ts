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
import Tenant from '../../models/tenant';
import Tutor from '../../models/tutor';
import User from '../../models/user';
import { mongoId, prob, randomItem, randomItems, schoolYear, shuffle } from '../../utils/helper';
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
  questionCount = 2, // per user (per tenant)
  contentCount = 5, // contents count per question
  bidCount = 5,
): Promise<string> => {
  const [{ primaryLevels, juniorLevels, seniorLevels }, books, classrooms, tenants, tutors, users] = await Promise.all([
    findLevels(),
    Book.find({ deletedAt: { $exists: false } }).lean(),
    Classroom.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.find({
      services: { $in: [TENANT.SERVICE.CLASSROOM, TENANT.SERVICE.TUTOR] },
      ...(codes.length && { code: { $in: codes } }),
      deletedAt: { $exists: false },
    }).lean(),
    Tutor.find({ deletedAt: { $exists: false } }).lean(),
    User.find({ status: USER.STATUS.ACTIVE, schoolHistories: { $ne: [] }, deletedAt: { $exists: false } }).lean(),
  ]);

  const studentLevelIds = [...primaryLevels, ...juniorLevels, ...seniorLevels].map(lvl => lvl._id);

  const contents: ContentDocument[] = [];
  const questions: QuestionDocument[] = [];

  users
    .sort(shuffle)
    .filter(
      user =>
        user.tenants.some(t => tenants.some(tenant => t.equals(tenant._id))) &&
        user.schoolHistories[0]?.year === schoolYear() &&
        studentLevelIds.some(levelId => user.schoolHistories[0]?.level.equals(levelId)),
    )
    .forEach(student =>
      student.tenants.forEach(studentTenant => {
        const tenant = tenants.find(t => t._id.equals(studentTenant))!;

        const studentClassrooms = classrooms.filter(
          classroom => classroom.students.some(s => s.equals(student._id)) && classroom.year === schoolYear(),
        );

        const tenantTutors = tutors.filter(tutor => tutor.specialties.some(s => s.tenant.equals(studentTenant)));

        if (studentClassrooms.length && tenant)
          Array(questionCount)
            .fill(0)
            .forEach(() => {
              const classroom = randomItem(studentClassrooms);
              const book = books.find(b => classroom.books.some(book => book.equals(b._id)));

              const tutorUserIds =
                classroom && tenant?.school
                  ? classroom.teachers
                  : tenant?.services.includes(TENANT.SERVICE.TUTOR)
                  ? tenantTutors
                      .filter(({ specialties }) =>
                        specialties.some(
                          ({ level, subject }) => level.equals(classroom.level) && subject.equals(classroom.subject),
                        ),
                      )
                      .slice(0, bidCount)
                      .map(tutor => tutor.user)
                  : [];

              if (tutorUserIds.length) {
                const isBidding =
                  tutorUserIds.length > 1 && tenant.services.includes(TENANT.SERVICE.QUESTION_BID) && prob(0.8); // special condition for JEST (which has all services)

                const questionId = mongoId();

                // generate contents (at least one)
                const newContents = Array(Math.max(1, contentCount))
                  .fill(0)
                  .map((_, idx) =>
                    fakeContents(
                      `/questions/${questionId}`,
                      tutorUserIds[0] && idx % 2 ? [tutorUserIds[0]] : [student._id],
                      1,
                    ),
                  )
                  .flat();
                contents.push(...newContents);

                const bids: QuestionDocument['bids'] = isBidding
                  ? randomItems(tutorUserIds, Math.ceil(tutorUserIds.length * 0.9))
                      .sort(shuffle)
                      .map(bidderId => {
                        const bidContents = Array(Math.ceil(Math.random() * 5))
                          .map((_, idx) =>
                            fakeContents(
                              `/questions/${questionId}/${bidderId}`,
                              idx % 2 ? [student._id] : [bidderId],
                              1,
                            ),
                          )
                          .flat();
                        contents.push(...bidContents);

                        return {
                          bidder: bidderId,
                          ...(prob(0.5) && { price: faker.number.int({ min: 5, max: 50 }) * 1000 }),
                          contents: bidContents.map(c => c._id),
                        };
                      })
                  : [];

                const bookRev = book?.revisions && randomItem(book.revisions).rev;
                questions.push(
                  new Question<Partial<QuestionDocument>>({
                    _id: questionId,
                    ...(student.flags.includes(USER.FLAG.EDA) && { flags: [QUESTION.FLAG.EDA] }),
                    tenant: tenant._id,
                    student: student._id,
                    ...((!isBidding || (isBidding && prob(0.5))) && { tutor: tutorUserIds[0] }),

                    members: randomItems([student._id, ...tutorUserIds], Math.ceil(Math.random() * 3)).map(user => ({
                      user,
                      flags: prob(0.3) ? [CHAT.MEMBER.FLAG.IMPORTANT] : [],
                      lastViewedAt: faker.date.recent({ days: 1 }),
                    })),

                    deadline: faker.date.soon({ days: 7 }),
                    classroom: classroom._id,
                    level: classroom.level,
                    subject: classroom.subject,
                    ...(book && { book: book._id }),
                    ...(bookRev && { bookRev }),
                    ...(bookRev &&
                      prob(0.8) && {
                        chapter: `${faker.number.int({ min: 1, max: 10 })}#${faker.number.int({ min: 1, max: 30 })}`,
                      }),

                    // assignment
                    // assignmentIdx
                    // homework

                    lang: randomItem(Object.keys(QUESTION.LANG)),

                    contents: newContents.map(c => c._id),
                    ...(!isBidding && { contents: newContents.map(c => c._id) }),

                    ...(!isBidding && prob(0.8) && { timeSpent: faker.number.int({ min: 5, max: 60 }) }),

                    ...(!isBidding && prob(0.8) && { correctness: faker.number.int({ min: 1, max: 5 }) * 1000 }),
                    ...(!isBidding && prob(0.8) && { explicitness: faker.number.int({ min: 1, max: 5 }) * 1000 }),
                    ...(!isBidding && prob(0.8) && { punctuality: faker.number.int({ min: 1, max: 5 }) * 1000 }),

                    // extra
                    bidders: tutorUserIds,
                    ...(prob(0.5) && { price: faker.number.int({ min: 1, max: 10 }) * 1000 }),
                    ...(isBidding && { bids }),
                    ...(!isBidding && prob(0.5) && { paidAt: faker.date.soon({ days: 7 }) }),
                  }),
                );
              }
            });
      }),
    );

  await Promise.all([
    Content.insertMany<Partial<ContentDocument>>(contents, { rawResult: true }),
    Question.insertMany<Partial<QuestionDocument>>(questions, { rawResult: true }),
  ]);
  return `(${chalk.green(questions.length)} questions [for ${tenants.length} tenant(s)] (with ${
    contents.length
  } contents) created)`;
};

export { fake };
