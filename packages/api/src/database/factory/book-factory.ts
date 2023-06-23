/**
 * Factory: Book
 *
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import type { BookAssignmentDocument, BookDocument, Id } from '../../models/book';
import Book, { BookAssignment } from '../../models/book';
import type { ChatGroupDocument } from '../../models/chat-group';
import ChatGroup from '../../models/chat-group';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import type { ContributionDocument } from '../../models/contribution';
import Contribution from '../../models/contribution';
import Level from '../../models/level';
import Publisher from '../../models/publisher';
import Subject from '../../models/subject';
import User, { UserDocument } from '../../models/user';
import { idsToString, mongoId, prob, randomString, shuffle } from '../../utils/helper';
import { fakeContents } from '../helper';

const { CHAT_GROUP, USER } = LOCALE.DB_ENUM;

const fakeContribution = (contributors: (UserDocument & Id)[]) =>
  new Contribution<Partial<ContributionDocument>>({
    title: faker.lorem.slug(5),
    ...(prob(0.5) && { description: faker.lorem.sentences(3) }),
    contributors: contributors.map(user => ({
      user: user._id,
      name: faker.name.fullName(),
      school: user.schoolHistories[0]!.school,
    })),
    urls: Array(3)
      .fill(0)
      .map(_ => faker.internet.url()),
  });

/**
 * Generate (factory)
 */
const fake = async (count = 100, rev = 3, assignmentCount = 10, supplementCount = 5): Promise<string> => {
  const [levels, publishers, subjects, users] = await Promise.all([
    Level.find({ deletedAt: { $exists: false } }).lean(),
    Publisher.find({ deletedAt: { $exists: false } }).lean(),
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    User.find({ status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } }).lean(),
  ]);

  if (!levels.length) throw new Error('Level Collection is empty');
  if (!publishers.length) throw new Error('Publisher Collection is empty');

  const books: (BookDocument & Id)[] = [];
  const bookAssignments: (BookAssignmentDocument & Id)[] = [];
  const chatGroups: (ChatGroupDocument & Id)[] = [];
  const contents: (ContentDocument & Id)[] = [];
  const contributions: (ContributionDocument & Id)[] = [];

  for (let i = 0; i < count; i++) {
    const bookId = mongoId();

    const [levelId] = idsToString(levels).sort(shuffle);
    if (!levelId) throw 'no valid levelId';
    const validSubjectIds = idsToString(subjects.filter(subject => idsToString(subject.levels).includes(levelId)));
    if (!validSubjectIds.length) continue; // skip this iteration if no validSubjects available (this is not a bug, it could happen)

    const year = faker.datatype.number(20) + 2000;

    const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
      flags: [CHAT_GROUP.FLAG.BOOK],
      title: 'Book (factory) Chat',
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      key: `BOOK#${bookId}`,
    });
    chatGroups.push(chatGroup);

    const contributors = users
      .filter(user => user.schoolHistories.length)
      .sort(shuffle)
      .slice(0, 5);

    const assignments = Array(assignmentCount)
      .fill(0)
      .map(_ => {
        const bookAssignmentId = mongoId();

        const contribution = fakeContribution(contributors);
        contributions.push(contribution);

        const [content, ...examples] = fakeContents('bookAssignments', bookAssignmentId, idsToString(contributors), 5);
        contents.push(content!, ...examples);

        const hasDynParams = prob(0.5);

        return new BookAssignment<Partial<BookAssignmentDocument & Id>>({
          _id: bookAssignmentId,
          contribution: contribution._id,
          chapter: `${faker.datatype.number(10)}#${faker.datatype.number(20)}`,
          content: content!._id,
          dynParams: hasDynParams
            ? Array(3)
                .fill(0)
                .map(_ => faker.datatype.number(30).toString())
            : [],
          solutions: hasDynParams
            ? Array(3)
                .fill(0)
                .map(_ => faker.datatype.number(30).toString())
            : [faker.datatype.number(30).toString()],
          examples: idsToString(examples),
        });
      });
    bookAssignments.push(...assignments);

    const supplements: BookDocument['supplements'] = Array(supplementCount)
      .fill(0)
      .map(_ => {
        const contribution = fakeContribution(contributors);
        contributions.push(contribution);

        return {
          _id: mongoId(),
          contribution,
          chapter: `${faker.datatype.number(10)}#${faker.datatype.number(20)}`,
          ...(prob(0.1) && { deletedAt: faker.date.recent(120) }),
        };
      });

    const book = new Book<Partial<BookDocument & Id>>({
      _id: bookId,
      publisher: idsToString(publishers).sort(shuffle)[0],
      level: levelId,
      subjects: validSubjectIds.sort(shuffle).slice(0, Math.ceil(Math.random() * 3)),
      title: faker.lorem.slug(5),
      ...(prob(0.5) && { subTitle: faker.lorem.sentence(6) }),
      chatGroup: chatGroup._id,

      assignments: idsToString(assignments),
      supplements,

      revisions: Array(rev)
        .fill(0)
        .map((_, idx) => ({
          _id: mongoId(),
          rev: String(rev - idx + 1),
          ...(prob(0.8) && { isbn: randomString() }),
          year: year - idx,
          imageUrls: [],
          ...(prob(0.3) && { listPrice: faker.datatype.number({ min: 100, max: 200 }) * 1000 }),
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
    });
    books.push(book);
  }

  await Promise.all([
    Book.create(books),
    BookAssignment.create(bookAssignments),
    ChatGroup.create(chatGroups),
    Contribution.create(contributions),
    Content.create(contents),
  ]);
  return `(${chalk.green(books.length)} - ${chalk.green(bookAssignments.length)} created)`;
};

export { fake };
