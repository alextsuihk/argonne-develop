/**
 * JEST Test: /api/books routes
 *
 */

import type { LeanDocument } from 'mongoose';

import {
  expectedContentFormat,
  expectedContributionFormat,
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE2,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomId,
  shuffle,
} from '../../jest';
import type { BookAssignmentDocument, BookDocument } from '../../models/book';
import Book from '../../models/book';
import Level from '../../models/level';
import Publisher from '../../models/publisher';
import School from '../../models/school';
import Subject from '../../models/subject';
import type { UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany, getById } = commonTest;
const route = 'books';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let adminUser: LeanDocument<UserDocument> | null;
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let url: string;

  // expected MINIMUM single book format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    publisher: expect.any(String),
    level: expect.any(String),
    subjects: expect.arrayContaining([expect.any(String)]),
    title: expect.any(String),
    chatGroup: expect.any(String),
    supplements: expect.any(Array),
    revisions: expect.any(Array),
  };

  const expectedWithAssignmentMinFormat = {
    ...expectedMinFormat,
    assignments: expect.arrayContaining([
      expect.objectContaining({
        _id: expectedIdFormat,
        contribution: expectedContributionFormat,
        chapter: expect.any(String),
        content: expectedContentFormat,
        dynParams: expect.any(Array),
        solutions: expect.arrayContaining([expect.any(String)]),
        examples: expect.any(Array),
      }),
    ]),
  };

  const expectedWithSupplementMinFormat = {
    ...expectedMinFormat,
    supplements: expect.arrayContaining([
      expect.objectContaining({
        _id: expectedIdFormat,
        contribution: expectedContributionFormat,
        chapter: expect.any(String),
      }),
    ]),
  };

  const expectedWithRevMinFormat = {
    ...expectedMinFormat,
    revisions: expect.arrayContaining([
      expect.objectContaining({
        _id: expectedIdFormat,
        rev: expect.any(String),
        year: expect.any(Number),
        imageUrls: expect.any(Array),
        createdAt: expect.any(String),
      }),
    ]),
  };

  beforeAll(async () => {
    ({ adminUser, normalUsers } = await jestSetup(['admin', 'normal']));
  });
  afterAll(async () => Promise.all([jestRemoveObject(url), jestTeardown()]));

  test('should pass when getMany & getById (as guest)', async () =>
    getMany(route, {}, expectedMinFormat, { testGetById: true, testInvalidId: true, testNonExistingId: true }));

  test('should pass when getById [with assignments & supplements] (as teacher)', async () => {
    const [books, teacherLevel] = await Promise.all([
      Book.find({ 'assignments.0': { $exists: true }, 'supplements.0': { $exists: true } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    if (!books.length || !teacherLevel)
      throw 'teacherLevel & a book (with assignments and supplements) are needed for testing.';

    const teacher = normalUsers!.find(
      ({ histories }) => histories[0]?.level.toString() === teacherLevel!._id.toString(),
    )!;

    await getById(
      route,
      { 'Jest-User': teacher!._id },
      { ...expectedWithAssignmentMinFormat, ...expectedWithSupplementMinFormat },
      { id: randomId(books) },
    );
  });

  test('should pass when ADD, JOIN_CHAT, ADD_REMARK, UPDATE, ADD_REVISION, REMOVE_REVISION & DELETE (as admin)', async () => {
    expect.assertions(3 * (13 + 1));

    const [teacherLevel, allPublishers, allSchools, allSubjects] = await Promise.all([
      Level.findOne({ code: 'TEACHER' }).lean(),
      Publisher.find({ deletedAt: { $exists: false } }).lean(),
      School.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
    ]);

    if (!allPublishers.length || !allSchools.length || !allSubjects.length || !teacherLevel)
      throw `At least one subject & one publisher are required/ ${allSubjects.length} subjects, and ${allPublishers.length} publishers.`;

    const [subject] = allSubjects.sort(shuffle);
    const level = randomId(subject.levels);
    const subjects = [subject._id.toString()];
    const publisher = randomId(allPublishers);

    const teacher = normalUsers!.find(
      ({ histories }) => histories[0]?.level.toString() === teacherLevel!._id.toString(),
    )!;

    // create, addRemark, (teacher) join bookChat, addRevision, addAssignment, addSupplement
    const book = await createUpdateDelete<BookDocument>(
      route,
      { 'Jest-User': adminUser!._id },
      [
        {
          action: 'create',
          data: { publisher, level, subjects, title: FAKE, ...(prob(0.5) && { subTitle: FAKE }) },
          expectedMinFormat: { ...expectedMinFormat, publisher, level, subjects, title: FAKE },
        },
        {
          action: 'addRemark',
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(adminUser!, FAKE) },
        },
        { action: 'joinChat', headers: { 'Jest-User': teacher!._id }, data: {} }, // a teacher join book chat
        {
          action: 'update',
          data: { publisher, level, subjects, title: FAKE2, ...(prob(0.5) && { subTitle: FAKE }) },
          expectedMinFormat: { ...expectedMinFormat, publisher, level, subjects, title: FAKE2 },
        },
        {
          action: 'addRevision',
          data: {
            revision: {
              rev: FAKE,
              ...(prob(0.5) && { isbn: FAKE }),
              year: 2020,
              ...(prob(0.5) && { listPrice: 1000 }),
            },
          },
          expectedMinFormat: expectedWithRevMinFormat,
        },
        {
          action: 'addAssignment',
          data: {
            assignment: {
              chapter: FAKE,
              content: FAKE2,
              dynParams: ['A', 'B', 'C'],
              solutions: ['AA', 'BB', 'CC'],
              examples: ['A-ex', 'B-ex'],
              contribution: {
                title: FAKE,
                ...(prob(0.5) && { description: FAKE2 }),
                contributors: Array(2)
                  .fill(0)
                  .map((_, idx) => ({
                    user: normalUsers![idx]._id.toString(),
                    name: normalUsers![idx].name,
                    school: allSchools[idx]._id.toString(),
                  })),
                urls: ['https://github.com/path-one', 'https://gitlab.inspire.hk/path-two'],
              },
            },
          },
          expectedMinFormat: expectedWithAssignmentMinFormat,
        },
        {
          action: 'addSupplement',
          data: {
            supplement: {
              contribution: {
                title: FAKE,
                ...(prob(0.5) && { description: FAKE }),
                contributors: [{ user: randomId(normalUsers!), name: FAKE, school: randomId(allSchools) }],
                urls: ['http://github/some-path', 'http://github/some-path-two'],
              },
              chapter: FAKE,
            },
          },
          expectedMinFormat: expectedWithSupplementMinFormat,
        },
      ],
      { skipAssertion: true },
    );

    const created = await Book.findById(book!._id).lean();
    const revisionId = created!.revisions[0]._id.toString();
    const assignmentId = (created!.assignments[0] as LeanDocument<BookAssignmentDocument>)._id.toString();
    const supplementId = created!.supplements[0]._id.toString();
    url = await jestPutObject(adminUser!);

    // addRevisionImage, removeRevisionImage, removeRevision, removeAssignment, removeSupplement & delete
    await createUpdateDelete<BookDocument>(
      route,
      { 'Jest-User': adminUser!._id },
      [
        { action: 'addRevisionImage', data: { revisionId, url }, expectedMinFormat: expectedWithRevMinFormat },
        { action: 'removeRevisionImage', data: { revisionId, url }, expectedMinFormat: expectedWithRevMinFormat },
        { action: 'removeRevision', data: { revisionId, ...(prob(0.5) && { remark: FAKE2 }) }, expectedMinFormat },
        {
          action: 'removeAssignment',
          data: { assignmentId, ...(prob(0.5) && { remark: FAKE }) },
          expectedMinFormat,
        },
        {
          action: 'removeSupplement',
          data: { supplementId, ...(prob(0.5) && { remark: FAKE2 }) },
          expectedMinFormat,
        },
        { action: 'delete', data: {} },
      ],
      { skipAssertion: true, overrideId: book!._id.toString() },
    );
  });
});
