/**
 * Factory: Book
 *
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import type { BookAssignmentDocument, BookDocument } from '../../models/book';
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
import User from '../../models/user';
import { mongoId, prob, randomItem, randomItems, randomString } from '../../utils/helper';
import { fakeContents, fakeContribution } from '../helper';

const { CHAT_GROUP, USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 */
const fake = async (count = 200, rev = 3, assignmentCount = 10, supplementCount = 5): Promise<string> => {
  const [levels, publishers, subjects, users, { systemId }] = await Promise.all([
    Level.find({ deletedAt: { $exists: false } }).lean(),
    Publisher.find({ deletedAt: { $exists: false } }).lean(),
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    User.find({
      status: USER.STATUS.ACTIVE,
      'schoolHistories.school': { $exists: true }, // pull only students (and teachers)
      deletedAt: { $exists: false },
    }).lean(),
    User.findSystemAccountIds(),
  ]);

  if (!levels.length) throw new Error('Level Collection is empty');
  if (!publishers.length) throw new Error('Publisher Collection is empty');

  const books: BookDocument[] = [];
  const bookAssignments: BookAssignmentDocument[] = [];
  const chatGroups: ChatGroupDocument[] = [];
  const contents: ContentDocument[] = [];
  const contributions: ContributionDocument[] = [];

  for (let i = 0; i < count; i++) {
    const bookId = mongoId();

    const level = randomItem(levels);
    const validSubjects = subjects.filter(subject => subject.levels.some(l => l.equals(level._id)));
    if (!validSubjects.length) continue; // skip this iteration if no validSubjects available (this is not a bug, it could happen)

    const year = faker.number.int({ min: 2000, max: 2020 });

    const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
      flags: [CHAT_GROUP.FLAG.BOOK],
      title: 'Book (factory) Chat',
      membership: CHAT_GROUP.MEMBERSHIP.CLOSED,
      key: `BOOK#${bookId}`,
    });
    chatGroups.push(chatGroup);

    const assignments = Array(assignmentCount)
      .fill(0)
      .map(() => {
        const bookAssignmentId = mongoId();

        const contribution = fakeContribution(randomItems(users, 3));
        contributions.push({ ...contribution.toObject(), book: bookId });

        const [content, ...examples] = fakeContents(`/bookAssignments/${bookAssignmentId}`, [systemId], 5);
        contents.push(content!, ...examples);

        const hasDynParams = prob(0.5);

        return new BookAssignment<Partial<BookAssignmentDocument>>({
          _id: bookAssignmentId,
          contribution: contribution._id,
          chapter: `${faker.number.int({ min: 1, max: 10 })}#${faker.number.int({ min: 1, max: 20 })}`,
          content: content!._id,

          dynParams: Array(hasDynParams ? 3 : 0)
            .fill(0)
            .map(() => faker.number.int({ max: 30 }).toString()),

          solutions: Array(hasDynParams ? 3 : 1)
            .fill(0)
            .map(() => faker.number.int({ max: 30 }).toString()),
          examples: examples.map(e => e._id),

          ...(prob(0.1) && { deletedAt: faker.date.recent({ days: 120 }) }),
        });
      });
    bookAssignments.push(...assignments);

    const book = new Book<Partial<BookDocument>>({
      _id: bookId,
      publisher: randomItem(publishers)._id,
      level: level._id,
      subjects: randomItems(validSubjects, Math.ceil(Math.random() * 3)).map(s => s._id),
      // subjects: randomItems(validSubjects, Math.ceil(Math.random() * 3)).map(s => s._id),
      title: `factory ${faker.lorem.slug(5)}`,
      ...(prob(0.5) && { subTitle: faker.lorem.sentence(6) }),
      chatGroup: chatGroup._id,

      assignments: assignments.map(a => a._id),

      supplements: Array(supplementCount)
        .fill(0)
        .map(() => {
          const contribution = fakeContribution(randomItems(users, 3));
          contributions.push({ ...contribution.toObject(), book: bookId });

          return {
            _id: mongoId(),
            contribution: contribution._id,
            chapter: `${faker.number.int({ min: 1, max: 10 })}#${faker.number.int({ min: 1, max: 20 })}`,
            ...(prob(0.1) && { deletedAt: faker.date.recent({ days: 120 }) }),
          };
        }),

      revisions: Array(rev)
        .fill(0)
        .map((_, idx) => ({
          _id: mongoId(),
          rev: String(rev - idx + 1),
          ...(prob(0.8) && { isbn: randomString() }),
          year: year - idx,
          imageUrls: Array(2)
            .fill(0)
            .map(() => faker.image.urlLoremFlickr({ category: 'food' })),
          ...(prob(0.3) && { listPrice: faker.number.int({ min: 100, max: 200 }) * 1000 }),
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
    });
    books.push(book);
  }

  await Promise.all([
    Book.insertMany<Partial<BookDocument>>(books, { includeResultMetadata: true }),
    BookAssignment.insertMany<Partial<BookAssignmentDocument>>(bookAssignments, { includeResultMetadata: true }),
    ChatGroup.insertMany<Partial<ChatGroupDocument>>(chatGroups, { includeResultMetadata: true }),
    Contribution.insertMany<Partial<ContributionDocument>>(contributions, { includeResultMetadata: true }),
    Content.insertMany<Partial<ContentDocument>>(contents, { includeResultMetadata: true }),
  ]);
  return `(${chalk.green(books.length)} books with ${chalk.green(bookAssignments.length)} bookAssignments created)`;
};

export { fake };
