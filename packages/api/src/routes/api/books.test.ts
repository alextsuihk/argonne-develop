/**
 * JEST Test: /api/books routes
 *
 */

import { CONTENT_PREFIX } from '@argonne/common';

import {
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
import Book, { BookAssignment } from '../../models/book';
import Level from '../../models/level';
import Publisher from '../../models/publisher';
import School from '../../models/school';
import Subject from '../../models/subject';
import type { Id, UserDocument } from '../../models/user';
import commonTest from './rest-api-test';

const { createUpdateDelete, getMany, getById } = commonTest;
const route = 'books';

// Top level of this test suite:
describe(`${route.toUpperCase()} API Routes`, () => {
  let adminUser: (UserDocument & Id) | null;
  let normalUsers: (UserDocument & Id)[] | null;
  let url: string;
  let teacherLevelId: string;

  // expected MINIMUM single book format
  const expectedMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),

    publisher: expect.any(String),
    level: expect.any(String),
    subjects: expect.arrayContaining([expect.any(String)]),
    title: expect.any(String),
    chatGroup: expect.any(String),

    assignments: expect.any(Array),
    supplements: expect.any(Array),
    revisions: expect.any(Array),

    createdAt: expect.any(String),
    updatedAt: expect.any(String),

    contentsToken: expect.any(String),
  };

  const expectedAssignmentMinFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    contribution: expectedContributionFormat,
    chapter: expect.any(String),
    content: expect.any(String),
    dynParams: expect.any(Array),
    solutions: expect.any(Array),
    examples: expect.any(Array),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  };

  const expectedRevMinFormat = {
    _id: expectedIdFormat,
    rev: expect.any(String),
    year: expect.any(Number),
    imageUrls: expect.any(Array),
    createdAt: expect.any(String),
  };

  const expectedSupplementMinFormat = {
    _id: expectedIdFormat,
    contribution: expectedContributionFormat,
    chapter: expect.any(String),
  };

  beforeAll(async () => {
    ({ adminUser, normalUsers } = await jestSetup(['admin', 'normal']));
    const teacher = await Level.findOne({ code: 'TEACHER' }).lean();
    if (!teacher) throw 'no valid teacher-level';
    teacherLevelId = teacher._id.toString();
  });
  afterAll(async () => Promise.all([url && jestRemoveObject(url), jestTeardown()]));

  test('should pass when getMany & getById (as non-teacher)', async () => {
    const nonTeacher = normalUsers!.find(
      ({ schoolHistories }) => schoolHistories[0].level.toString() !== teacherLevelId,
    );

    await getMany(
      route,
      { 'Jest-User': nonTeacher!._id },
      {
        ...expectedMinFormat,
        remarks: [],
        assignments: expect.arrayContaining([expect.objectContaining(expectedAssignmentMinFormat)]),
      },
      {
        testGetById: true,
        testInvalidId: true,
        testNonExistingId: true,
      },
    );
  });

  test('should pass when getById [with assignments solutions] (as teacher)', async () => {
    const teacher = normalUsers!.find(
      ({ schoolHistories }) => schoolHistories[0] && schoolHistories[0]?.level.toString() === teacherLevelId,
    );

    const bookAssignments = await BookAssignment.find({ solutions: { $ne: [] } }).lean();
    const books = await Book.find({ assignments: { $in: bookAssignments } }).lean();

    await getById(
      route,
      { 'Jest-User': teacher!._id },
      {
        ...expectedMinFormat,
        remarks: [],
        assignments: expect.arrayContaining([
          expect.objectContaining({
            ...expectedAssignmentMinFormat,
            solutions: expect.arrayContaining([expect.any(String)]),
          }),
        ]),
      },
      { id: randomId(books) },
    );
  });

  test('should pass when ADD,  ADD_REMARK, UPDATE, ADD_REVISION, REMOVE_REVISION & DELETE (as admin)', async () => {
    expect.assertions(3 * (12 + 1));

    const [allPublishers, allSchools, allSubjects] = await Promise.all([
      Publisher.find({ deletedAt: { $exists: false } }).lean(),
      School.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
    ]);

    if (!allPublishers.length || !allSchools.length || !allSubjects.length)
      throw `At least one subject & one publisher are required/ ${allSubjects.length} subjects, and ${allPublishers.length} publishers.`;

    const [subject] = allSubjects.sort(shuffle);
    const level = randomId(subject.levels);
    const subjects = [subject._id.toString()];
    const publisher = randomId(allPublishers);

    const revision = {
      rev: FAKE,
      ...(prob(0.5) && { isbn: FAKE }),
      year: 2020,
      ...(prob(0.5) && { listPrice: 1000 }),
    };

    // create, addRemark, (teacher) join bookChat, addRevision, addAssignment, addSupplement
    const book = await createUpdateDelete<BookDocument & Id>(
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
          expectedMinFormat: { ...expectedMinFormat, ...expectedRemark(adminUser!._id, FAKE) },
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
                contributors: Array(2)
                  .fill(0)
                  .map((_, idx) => ({
                    user: normalUsers![idx]._id.toString(),
                    name: normalUsers![idx].name,
                    school: allSchools[idx]._id.toString(),
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
                ...expectedAssignmentMinFormat,
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
                contributors: [{ user: randomId(normalUsers!), name: FAKE, school: randomId(allSchools) }],
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
    const assignmentId = (created!.assignments[0] as BookAssignmentDocument & Id)._id.toString();
    const supplementId = created!.supplements[0]._id.toString();
    url = await jestPutObject(adminUser!._id);

    // addRevisionImage, removeRevisionImage, removeRevision, removeAssignment, removeSupplement & delete
    await createUpdateDelete<BookDocument>(
      route,
      { 'Jest-User': adminUser!._id },
      [
        {
          action: 'addRevisionImage',
          data: { revisionId, url },
          expectedMinFormat: {
            ...expectedMinFormat,
            revisions: [expect.objectContaining({ ...expectedRevMinFormat, ...revision, imageUrls: [url] })],
          },
        },
        {
          action: 'removeRevisionImage',
          data: { revisionId, url },
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
          data: { revisionId, ...(prob(0.5) && { remark: FAKE2 }) },
          expectedMinFormat: {
            ...expectedMinFormat,
            revisions: [expect.objectContaining({ ...expectedRevMinFormat, deletedAt: expect.any(String) })], // isbn is removed
          },
        },
        {
          action: 'removeAssignment',
          data: { assignmentId, ...(prob(0.5) && { remark: FAKE }) },
          expectedMinFormat: {
            ...expectedMinFormat,
            assignments: [expect.objectContaining({ ...expectedAssignmentMinFormat, deletedAt: expect.any(String) })],
          },
        },
        {
          action: 'removeSupplement',
          data: { supplementId, ...(prob(0.5) && { remark: FAKE2 }) },
          expectedMinFormat: {
            ...expectedMinFormat,
            supplements: [expect.objectContaining({ ...expectedSupplementMinFormat, deletedAt: expect.any(String) })],
          },
        },
        { action: 'delete', data: {} },
      ],
      { skipAssertion: true, overrideId: book!._id.toString() },
    );
  });
});
