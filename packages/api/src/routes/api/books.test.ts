/**
 * JEST Test: /api/books routes
 *
 *
 */

import { CONTENT_PREFIX } from '@argonne/common';

import type { BookDocumentEx } from '../../controllers/book';
import {
  expectedBookAssignmentFormat,
  expectedContributionFormat,
  expectedDateFormat,
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE2,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomItems,
} from '../../jest';
import Book, { BookAssignment } from '../../models/book';
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
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  // expected MINIMUM single book format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    publisher: expectedIdFormat,
    level: expectedIdFormat,
    subjects: expect.arrayContaining([expectedIdFormat]),
    title: expect.any(String),
    chatGroup: expectedIdFormat,

    assignments: expect.any(Array),
    supplements: expect.any(Array),
    revisions: expect.any(Array),

    createdAt: expectedDateFormat(),
    updatedAt: expectedDateFormat(),

    contentsToken: expect.any(String),
  };

  const expectedRevMinFormat = {
    _id: expectedIdFormat,
    rev: expect.any(String),
    year: expect.any(Number),
    imageUrls: expect.any(Array),
    createdAt: expectedDateFormat(),
  };

  const expectedSupplementMinFormat = {
    _id: expectedIdFormat,
    contribution: expect.objectContaining({ ...expectedContributionFormat(), book: expectedIdFormat }),
    chapter: expect.any(String),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should pass when getMany & getById (as non-Admin, non-teacher & non publishAdmin)', async () => {
    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();

    const nonTeacher = jest.normalUsers.find(
      ({ schoolHistories }) => schoolHistories[0] && !schoolHistories[0]?.level.equals(teacherLevel!._id),
    );
    if (!nonTeacher) throw 'no valid non-teacher for testing';

    await getMany(
      route,
      { 'Jest-User': nonTeacher!._id },
      {
        ...expectedMinFormat,
        remarks: [],
        assignments: expect.arrayContaining([expect.objectContaining(expectedBookAssignmentFormat())]),
      },
      { testGetById: true, testInvalidId: true, testNonExistingId: true },
    );
  });

  test('should pass when getById [with assignments solutions] (as teacher)', async () => {
    const bookAssignments = await BookAssignment.find({ solutions: { $ne: [] } }).lean();
    const [books, teacherLevel] = await Promise.all([
      Book.find({ assignments: { $in: bookAssignments } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const teacher = jest.normalUsers.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw 'no valid teacher for testing';

    const bookId = randomItem(books)._id.toString();
    await getById(
      route,
      { 'Jest-User': teacher!._id },
      {
        ...expectedMinFormat,
        _id: bookId,
        remarks: [],
        assignments: expect.arrayContaining([
          expect.objectContaining({
            ...expectedBookAssignmentFormat(),
            solutions: expect.arrayContaining([expect.any(String)]),
          }),
        ]),
      },
      { id: bookId },
    );
  });

  test('should pass when ADD, ADD_REMARK, UPDATE, ADD_REVISION, REMOVE_REVISION & DELETE (as admin)', async () => {
    expect.assertions(3 * (12 + 1));

    const [allPublishers, allSchools, allSubjects] = await Promise.all([
      Publisher.find({ deletedAt: { $exists: false } }).lean(),
      School.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
    ]);

    if (!allPublishers.length || !allSchools.length || !allSubjects.length)
      throw `At least one subject & one publisher are required/ ${allSubjects.length} subjects, and ${allPublishers.length} publishers.`;

    const subject = randomItem(allSubjects);
    const level = randomItem(subject.levels).toString();
    const subjects = [subject._id.toString()];
    const publisher = randomItem(allPublishers)._id.toString();

    const revision = {
      rev: FAKE,
      ...(prob(0.5) && { isbn: FAKE }),
      year: 2020,
      ...(prob(0.5) && { listPrice: 1000 }),
    };

    // create, addRemark, (teacher) join bookChat, addRevision, addAssignment, addSupplement
    const book = await createUpdateDelete<BookDocumentEx>(
      route,
      { 'Jest-User': jest.adminUser._id },
      [
        {
          action: 'create',
          data: { publisher, level, subjects, title: FAKE, ...(prob(0.5) && { subTitle: FAKE }) },
          expectedMinFormat: { ...expectedMinFormat, publisher, level, subjects, title: FAKE },
        },
        {
          action: 'addRemark',
          data: { remark: FAKE },
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(jest.adminUser._id, FAKE) },
        },
        {
          action: 'update',
          data: { publisher, level, subjects, title: FAKE2, ...(prob(0.5) && { subTitle: FAKE }) },
          expectedMinFormat: { ...expectedMinFormat, publisher, level, subjects, title: FAKE2 },
        },
        {
          action: 'addRevision',
          data: { revision },
          expectedMinFormat: {
            ...expectedMinFormat,
            revisions: [expect.objectContaining({ ...expectedRevMinFormat, ...revision })],
          },
        },
        {
          action: 'addAssignment',
          data: {
            assignment: {
              chapter: FAKE,
              content: FAKE2,
              dynParams: ['A', 'B', 'C'],
              solutions: ['AA', 'BB', 'CC'],
              contribution: {
                title: FAKE,
                ...(prob(0.5) && { description: FAKE2 }),
                contributors: randomItems(jest.normalUsers, 2).map(user => ({
                  user: user._id.toString(),
                  name: FAKE,
                  school: randomItem(allSchools)._id.toString(),
                })),
                urls: ['https://github.com/path-one', 'https://gitlab.inspire.hk/path-two'],
              },
              examples: ['A-ex', 'B-ex'],
            },
          },
          expectedMinFormat: {
            ...expectedMinFormat,
            assignments: [
              expect.objectContaining({
                ...expectedBookAssignmentFormat(),
                chapter: FAKE,
                dynParams: ['A', 'B', 'C'],
                solutions: ['AA', 'BB', 'CC'],
              }),
            ],
          },
        },
        {
          action: 'addSupplement',
          data: {
            supplement: {
              chapter: FAKE,
              contribution: {
                title: FAKE,
                ...(prob(0.5) && { description: FAKE }),
                contributors: randomItems(jest.normalUsers, 2).map(user => ({
                  user: user._id.toString(),
                  name: FAKE,
                  school: randomItem(allSchools)._id.toString(),
                })),
                urls: ['http://github/some-path', 'http://github/some-path-two'],
              },
            },
          },
          expectedMinFormat: {
            ...expectedMinFormat,
            supplements: [expect.objectContaining({ ...expectedSupplementMinFormat, chapter: FAKE })],
          },
        },
      ],
      { skipAssertion: true },
    );

    const created = await Book.findById(book!._id).lean();
    const revisionId = created!.revisions[0]._id.toString();
    const assignmentId = created!.assignments[0].toString();
    const supplementId = created!.supplements[0]._id.toString();
    const url = await jestPutObject(jest.adminUser._id);

    // addRevisionImage, removeRevisionImage, removeRevision, removeAssignment, removeSupplement & delete
    await createUpdateDelete<BookDocumentEx>(
      route,
      { 'Jest-User': jest.adminUser._id },
      [
        {
          action: 'addRevisionImage',
          data: { subId: revisionId, url },
          expectedMinFormat: {
            ...expectedMinFormat,
            revisions: [expect.objectContaining({ ...expectedRevMinFormat, ...revision, imageUrls: [url] })],
          },
        },
        {
          action: 'removeRevisionImage',
          data: { subId: revisionId, url },
          expectedMinFormat: {
            ...expectedMinFormat,
            revisions: [
              expect.objectContaining({
                ...expectedRevMinFormat,
                ...revision,
                imageUrls: [`${CONTENT_PREFIX.BLOCKED}#${url}`],
              }),
            ],
          },
        },
        {
          action: 'removeRevision',
          data: { subId: revisionId, ...(prob(0.5) && { remark: FAKE2 }) },
          expectedMinFormat: {
            ...expectedMinFormat,
            revisions: [
              expect.objectContaining({ ...expectedRevMinFormat, _id: revisionId, deletedAt: expectedDateFormat() }),
            ], // isbn is removed
          },
        },
        {
          action: 'removeAssignment',
          data: { subId: assignmentId, ...(prob(0.5) && { remark: FAKE }) },
          expectedMinFormat: {
            ...expectedMinFormat,
            assignments: [
              expect.objectContaining({
                ...expectedBookAssignmentFormat(),
                _id: assignmentId,
                deletedAt: expectedDateFormat(),
              }),
            ],
          },
        },
        {
          action: 'removeSupplement',
          data: { subId: supplementId, ...(prob(0.5) && { remark: FAKE2 }) },
          expectedMinFormat: {
            ...expectedMinFormat,
            supplements: [
              expect.objectContaining({
                ...expectedSupplementMinFormat,
                _id: supplementId,
                deletedAt: expectedDateFormat(),
              }),
            ],
          },
        },
        { action: 'delete', data: {} },
      ],
      { skipAssertion: true, overrideId: book!._id.toString() },
    );

    // clean up
    await jestRemoveObject(url);
  });
});
