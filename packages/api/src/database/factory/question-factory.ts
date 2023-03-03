/**
 * Factory: Question
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import mongoose from 'mongoose';

import Book from '../../models/book';
import Classroom from '../../models/classroom';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import type { BidDocument, QuestionDocument } from '../../models/question';
import Question, { Bid } from '../../models/question';
import Subject from '../../models/subject';
import Tenant from '../../models/tenant';
import Tutor from '../../models/tutor';
import User from '../../models/user';
import { idsToString, prob, shuffle } from '../../utils/helper';
import { findLevels } from '../seed/level-seed';

const { CHAT, QUESTION, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 */
const fake = async (
  questionCount: 5, // per user (per tenant)
  contentCount: 6, // contents count per question
  bidCount = 5,
): Promise<string> => {
  const [{ primaryLevels, juniorLevels, seniorLevels }, books, classrooms, subjects, tenants, tutors, users] =
    await Promise.all([
      findLevels(),
      Book.find({ deletedAt: { $exists: false } }).lean(),
      Classroom.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
      Tenant.find({ services: TENANT.SERVICE.QUESTION, deletedAt: { $exists: false } }).lean(),
      Tutor.find({ deletedAt: { $exists: false } }).lean(),
      User.find({ status: USER.STATUS.ACTIVE }).lean(),
    ]);

  const bids: BidDocument[] = [];
  const contents: ContentDocument[] = [];

  const students = users.filter(
    user =>
      user.histories[0] &&
      idsToString([...primaryLevels, ...juniorLevels, ...seniorLevels]).includes(user.histories[0].level.toString()),
  );

  const questions = tenants
    .map(tenant =>
      students
        .map(student =>
          Array(questionCount)
            .fill(0)
            .map(_ => {
              const isBidding = prob(0.3);

              const levelId = student.histories[0]!.level.toString();
              const subjectId =
                subjects
                  .sort(shuffle)
                  .find(subject => idsToString(subject.levels).includes(levelId))
                  ?._id.toString() ?? null;

              const potentialTutors = subjectId
                ? tutors
                    .sort(shuffle)
                    .filter(tutor =>
                      tutor.specialties.some(
                        ({ level, subject }) => level.toString() === levelId && subject.toString() == subjectId,
                      ),
                    )
                    .slice(0, 5)
                : [];

              const classroomId = classrooms
                .find(
                  classroom =>
                    classroom.tenant.toString() === tenant._id.toString() &&
                    idsToString(classroom.students).includes(student._id.toString()) &&
                    classroom.subject.toString() === subjectId &&
                    classroom.level.toString() === levelId,
                )
                ?._id.toString();

              const book = subjectId
                ? books
                    .sort(shuffle)
                    .find(book => idsToString(book.subjects).includes(subjectId) && book.level.toString() === levelId)
                : null;

              const questionId = new mongoose.Types.ObjectId();

              const [newContent, ...newContents] = Array(contentCount + 1)
                .fill(0)
                .map(
                  (_, idx) =>
                    new Content<Partial<ContentDocument>>({
                      parents: [`/questions/${questionId}`],
                      creator: potentialTutors[0] && idx % 2 ? potentialTutors[0].user : student._id,
                      data: faker.lorem.sentences(5),
                    }),
                );
              contents.push(newContent!, ...newContents);

              const newBids = potentialTutors.map(
                tutor =>
                  new Bid<Partial<BidDocument>>({
                    messages: Array(bidCount)
                      .fill(0)
                      .map(_ => ({
                        creator: tutor.user,
                        data: faker.lorem.sentences(3),
                        createdAt: faker.date.recent(5),
                      })),
                  }),
              );
              bids.push(...newBids);

              return subjectId && potentialTutors.length
                ? new Question<Partial<QuestionDocument>>({
                    ...(student.flags.includes(USER.FLAG.EDA) && { flags: [QUESTION.FLAG.EDA] }),
                    tenant: tenant._id,
                    students: [student._id],
                    tutors: isBidding ? [] : [potentialTutors[0]!.user],

                    members: !isBidding
                      ? [student, ...potentialTutors]
                          .sort(shuffle)
                          .slice(0, 3)
                          .map(user => ({
                            user: user._id,
                            flags: prob(0.3) ? [CHAT.MEMBER.FLAG.IMPORTANT] : [],
                            lastViewedAt: faker.date.recent(1),
                          }))
                      : [],

                    deadline: faker.date.soon(7),
                    ...(classroomId && { classroom: classroomId }),
                    level: levelId,
                    subject: subjectId,
                    ...(book && { book: book._id }),
                    ...(book && prob(0.5) && { bookRev: book.revisions.sort(shuffle)[0]!.rev }),
                    ...(prob(0.8) && { chapter: `${faker.datatype.number(10)}#${faker.datatype.number(30)}` }),

                    // assignment
                    // assignmentIdx
                    // homework

                    lang: Object.keys(QUESTION.LANG).sort(shuffle)[0],

                    content: newContent!._id,
                    ...(!isBidding && { contents: idsToString(newContents) }),

                    ...(!isBidding && prob(0.8) && { timeSpent: faker.datatype.number(60) }),

                    // extra
                    ...(prob(0.5) && { price: faker.datatype.number(10) * 1000 }),
                    bidders: isBidding ? idsToString(potentialTutors.slice(0, 5)) : [],
                    bids: idsToString(newBids),
                    ...(!isBidding && prob(0.5) && { paidAt: faker.date.soon(7) }),
                  })
                : null;
            })
            .flat(),
        )
        .flat(),
    )
    .flat()
    .filter(question => !!question); // remove null

  await Promise.all([Bid.create(bids), Content.create(contents), Question.create(questions)]);
  return `(${chalk.green(questions.length)} questions (with ${contents.length} contents) for ${
    students.length
  } students created)`;
};

export { fake };
