/**
 * Jest: /resolvers/book
 *
 */

import 'jest-extended';

import { CONTENT_PREFIX, LOCALE } from '@argonne/common';

import {
  apolloExpect,
  apolloContext,
  apolloTestServer,
  expectedBookAssignmentFormat,
  expectedContributionFormat,
  expectedDateFormat,
  expectedIdFormat,
  expectedRemark,
  FAKE,
  FAKE2,
  genUser,
  jestPutObject,
  jestRemoveObject,
  jestSetup,
  jestTeardown,
  prob,
  randomItem,
  randomItems,
} from '../jest';
import type { BookDocument } from '../models/book';
import Book, { BookAssignment } from '../models/book';
import Level from '../models/level';
import Publisher from '../models/publisher';
import School from '../models/school';
import Subject from '../models/subject';
import type { UserDocument } from '../models/user';
import User from '../models/user';
import {
  ADD_BOOK,
  ADD_BOOK_ASSIGNMENT,
  ADD_BOOK_REMARK,
  ADD_BOOK_REVISION,
  ADD_BOOK_REVISION_IMAGE,
  ADD_BOOK_SUPPLEMENT,
  GET_BOOK,
  GET_BOOKS,
  IS_ISBN_AVAILABLE,
  REMOVE_BOOK,
  REMOVE_BOOK_ASSIGNMENT,
  REMOVE_BOOK_REVISION,
  REMOVE_BOOK_REVISION_IMAGE,
  REMOVE_BOOK_SUPPLEMENT,
  UPDATE_BOOK,
} from '../queries/book';

const { MSG_ENUM } = LOCALE;

// Top level of this test suite:
describe('Book GraphQL', () => {
  let jest: Awaited<ReturnType<typeof jestSetup>>;

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    publisher: expectedIdFormat,
    level: expectedIdFormat,
    subjects: expect.arrayContaining([expectedIdFormat]),
    title: expect.any(String),
    subTitle: expect.toBeOneOf([null, expect.any(String)]),
    chatGroup: expectedIdFormat,

    assignments: expect.any(Array),
    supplements: expect.any(Array),
    revisions: expect.any(Array),

    remarks: expect.any(Array),
    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),

    contentsToken: expect.any(String),
  };

  const expectRevisionFormat = {
    _id: expectedIdFormat,
    rev: expect.any(String),
    isbn: expect.toBeOneOf([null, expect.any(String)]),
    year: expect.any(Number),
    imageUrls: expect.any(Array),
    listPrice: expect.toBeOneOf([null, expect.any(Number)]),
    createdAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  const expectedSupplementFormat = {
    _id: expectedIdFormat,
    contribution: { ...expectedContributionFormat(true), book: expectedIdFormat },
    chapter: expect.any(String),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  beforeAll(async () => (jest = await jestSetup()));
  afterAll(jestTeardown);

  test('should response a single object when GET All & GET One by ID (as non-Admin, non-teacher & non publishAdmin)', async () => {
    expect.assertions(2);

    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    const nonTeacher = jest.normalUsers.find(
      ({ schoolHistories }) => schoolHistories[0] && !schoolHistories[0].level.equals(teacherLevel!._id),
    );
    if (!nonTeacher) throw 'no valid non-teacher for testing';

    // Get all
    const resAll = await apolloTestServer.executeOperation(
      { query: GET_BOOKS },
      { contextValue: apolloContext(nonTeacher) },
    );
    apolloExpect(resAll, 'data', {
      books: expect.arrayContaining([
        { ...expectedFormat, remarks: [], assignments: expect.arrayContaining([expectedBookAssignmentFormat(true)]) },
      ]),
    });

    // Get One
    const books = await Book.find({ deletedAt: { $exists: false } }).lean();
    const id = randomItem(books)._id.toString();
    const resOne = await apolloTestServer.executeOperation(
      { query: GET_BOOK, variables: { id } },
      { contextValue: apolloContext(nonTeacher) },
    );

    apolloExpect(resOne, 'data', {
      book: {
        ...expectedFormat,
        _id: id,
        remarks: [],
        assignments: expect.arrayContaining([expectedBookAssignmentFormat(true)]),
      },
    });
  });

  test('should response a single object when GET One by ID [with assignments solution] (as teacher)', async () => {
    expect.assertions(1);

    const bookAssignments = await BookAssignment.find({ solutions: { $ne: [] } }).lean();
    const [books, teacherLevel] = await Promise.all([
      Book.find({ assignments: { $in: bookAssignments } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const teacher = jest.normalUsers.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw 'no valid teacher for testing';

    const id = randomItem(books)._id.toString();
    const res = await apolloTestServer.executeOperation(
      { query: GET_BOOK, variables: { id } },
      { contextValue: apolloContext(teacher) },
    );
    apolloExpect(res, 'data', {
      book: {
        ...expectedFormat,
        _id: id,
        remarks: [],
        assignments: expect.arrayContaining([
          { ...expectedBookAssignmentFormat(true), solutions: expect.arrayContaining([expect.any(String)]) },
        ]),
      },
    });
  });

  // guest user could get books
  // test('should fail when GET All or Get One as guest', async () => {
  //   expect.assertions(2);
  //   const resAll = await guestServer!.executeOperation({ query: GET_BOOKS });
  //   apolloExpect(resAll, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);

  //   const books = await Book.find({ deletedAt: { $exists: false } }).lean();
  //   const resOne = await guestServer!.executeOperation({
  //     query: GET_BOOK,
  //     variables: { id: randomItem(books)._id.toString() },
  //   });
  //   apolloExpect(resOne, 'error', `MSG_CODE#${MSG_ENUM.AUTH_ACCESS_TOKEN_ERROR}`);
  // });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_BOOK },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await apolloTestServer.executeOperation(
      { query: GET_BOOK, variables: { id: 'invalid-mongoID' } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'errorContaining', `MSG_CODE#${MSG_ENUM.USER_INPUT_ERROR}`);
  });

  test('should fail when mutating without ADMIN role & non-publisher', async () => {
    expect.assertions(2);

    const [publishers, subjects] = await Promise.all([
      Publisher.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
    ]);

    if (!subjects.length || !publishers.length)
      throw `At least one subject & one publisher are required/ ${subjects.length} subjects, and ${publishers.length} publishers.`;

    const subject = randomItem(subjects);
    const res = await apolloTestServer.executeOperation(
      {
        query: ADD_BOOK,
        variables: {
          book: {
            publisher: randomItem(publishers)._id.toString(),
            level: randomItem(subject.levels).toString(),
            subjects: [subject._id.toString()],
            title: FAKE,
            ...(prob(0.5) && { subTitle: FAKE }),
          },
        },
      },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // add remark
    const book = await Book.findOne().lean();
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_BOOK_REMARK, variables: { id: book!._id.toString(), remark: FAKE } },
      { contextValue: apolloContext(jest.normalUser) },
    );
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  // test set for admin or publisherAdmin
  const combinedTest = async (isAdmin: boolean) => {
    let assertions = 0;

    const [teacherLevel, allPublishers, allSchools, allSubjects] = await Promise.all([
      Level.findOne({ code: 'TEACHER' }).lean(),
      Publisher.find({ deletedAt: { $exists: false } }).lean(),
      School.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
    ]);
    const publisher = randomItem(allPublishers)._id.toString(); // non-changeable

    if (!publisher || !allSchools.length || !allSubjects.length || !teacherLevel)
      throw `At least one subject & one publisher are required/ ${allSubjects.length} subjects, and ${allPublishers.length} publishers.`;

    const publisherAdmin = genUser(null);

    if (!isAdmin)
      await Promise.all([
        publisherAdmin.save(),
        Publisher.updateOne({ _id: publisher }, { $push: { admins: publisherAdmin._id } }),
      ]);

    const [isbn, user] = isAdmin ? [FAKE, jest.adminUser] : [FAKE2, publisherAdmin];
    const url = await jestPutObject(user._id);

    // add a document
    const subject1 = randomItem(allSubjects);
    const create = {
      publisher,
      level: randomItem(subject1.levels).toString(),
      subjects: [subject1._id.toString()],
      title: FAKE,
      ...(prob(0.5) && { subTitle: FAKE }),
    };
    const createdRes = await apolloTestServer.executeOperation<{ addBook: BookDocument }>(
      { query: ADD_BOOK, variables: { book: create } },
      { contextValue: apolloContext(user) },
    );
    assertions += apolloExpect(createdRes, 'data', { addBook: { ...expectedFormat, ...create } });
    const newId = createdRes.body.kind === 'single' ? createdRes.body.singleResult.data!.addBook._id.toString() : null;

    // update newly created document
    const subject2 = randomItem(allSubjects);
    const update = {
      publisher,
      level: randomItem(subject2.levels).toString(),
      subjects: [subject2._id.toString()],
      title: FAKE2,
      ...(prob(0.5) && { subTitle: FAKE2 }),
    };
    const updatedRes = await apolloTestServer.executeOperation(
      { query: UPDATE_BOOK, variables: { id: newId, book: update } },
      { contextValue: apolloContext(user) },
    );
    assertions += apolloExpect(updatedRes, 'data', { updateBook: { ...expectedFormat, ...update } });

    if (isAdmin) {
      // addRemark (admin ONLY)
      const addRemarkRes = await apolloTestServer.executeOperation(
        { query: ADD_BOOK_REMARK, variables: { id: newId, remark: FAKE } },
        { contextValue: apolloContext(jest.adminUser) },
      );
      assertions += apolloExpect(addRemarkRes, 'data', {
        addBookRemark: { ...expectedFormat, ...expectedRemark(jest.adminUser._id, FAKE, true) },
      });

      // addAssignment (admin ONLY)
      const addAssignmentRes = await apolloTestServer.executeOperation<{ addBookAssignment: BookDocument }>(
        {
          query: ADD_BOOK_ASSIGNMENT,
          variables: {
            id: newId,
            assignment: {
              chapter: FAKE,
              content: FAKE2,
              dynParams: ['A', 'B', 'C'],
              solutions: ['AA', 'BB', 'CC'],
              examples: ['A-ex', 'B-ex'],
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
            },
          },
        },
        { contextValue: apolloContext(jest.adminUser) },
      );
      assertions += apolloExpect(addAssignmentRes, 'data', {
        addBookAssignment: {
          ...expectedFormat,
          assignments: [
            {
              ...expectedBookAssignmentFormat(true),
              chapter: FAKE,
              dynParams: ['A', 'B', 'C'],
              solutions: ['AA', 'BB', 'CC'],
            },
          ],
        },
      });
      const assignmentId =
        addAssignmentRes.body.kind === 'single'
          ? addAssignmentRes.body.singleResult.data!.addBookAssignment.assignments[0]._id.toString()
          : null;

      // removeAssignment (admin ONLY)
      const removeAssignmentRes = await apolloTestServer.executeOperation(
        {
          query: REMOVE_BOOK_ASSIGNMENT,
          variables: { id: newId, subId: assignmentId, ...(prob(0.5) && { remark: FAKE2 }) },
        },
        { contextValue: apolloContext(jest.adminUser) },
      );
      assertions += apolloExpect(removeAssignmentRes, 'data', {
        removeBookAssignment: {
          ...expectedFormat,
          assignments: [
            { ...expectedBookAssignmentFormat(true), _id: assignmentId, deletedAt: expectedDateFormat(true) },
          ],
        },
      });

      // addSupplement (admin ONLY)
      const addSupplementRes = await apolloTestServer.executeOperation<{ addBookSupplement: BookDocument }>(
        {
          query: ADD_BOOK_SUPPLEMENT,
          variables: {
            id: newId,
            supplement: {
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
              chapter: FAKE,
            },
          },
        },
        { contextValue: apolloContext(jest.adminUser) },
      );
      assertions += apolloExpect(addSupplementRes, 'data', {
        addBookSupplement: { ...expectedFormat, supplements: [{ ...expectedSupplementFormat, chapter: FAKE }] },
      });
      const supplementId =
        addSupplementRes.body.kind === 'single'
          ? addSupplementRes.body.singleResult.data!.addBookSupplement.supplements[0]._id.toString()
          : null;

      // removeSupplement (admin ONLY)
      const removeSupplementRes = await apolloTestServer.executeOperation(
        {
          query: REMOVE_BOOK_SUPPLEMENT,
          variables: { id: newId, subId: supplementId, ...(prob(0.5) && { remark: FAKE2 }) },
        },
        { contextValue: apolloContext(jest.adminUser) },
      );
      assertions += apolloExpect(removeSupplementRes, 'data', {
        removeBookSupplement: {
          ...expectedFormat,
          supplements: [{ ...expectedSupplementFormat, _id: supplementId, deletedAt: expectedDateFormat(true) }],
        },
      });
    }

    //  check isbn availability
    const isbnRes = await apolloTestServer.executeOperation(
      { query: IS_ISBN_AVAILABLE, variables: { isbn } },
      { contextValue: apolloContext(null) },
    );
    assertions += apolloExpect(isbnRes, 'data', { isIsbnAvailable: true });

    // addRevision
    const addRevisionRes = await apolloTestServer.executeOperation<{ addBookRevision: BookDocument }>(
      {
        query: ADD_BOOK_REVISION,
        variables: {
          id: newId,
          revision: { rev: FAKE, isbn, year: 2020, ...(prob(0.5) && { listPrice: 1000 }) },
        },
      },
      { contextValue: apolloContext(user) },
    );
    assertions += apolloExpect(addRevisionRes, 'data', {
      addBookRevision: { ...expectedFormat, revisions: [{ ...expectRevisionFormat, rev: FAKE, isbn, year: 2020 }] },
    });
    const revisionId =
      addRevisionRes.body.kind === 'single'
        ? addRevisionRes.body.singleResult.data!.addBookRevision.revisions[0]._id.toString()
        : null;

    // check isbn availability (after revision added)
    const isbnRes2 = await apolloTestServer.executeOperation(
      { query: IS_ISBN_AVAILABLE, variables: { isbn } },
      { contextValue: apolloContext(null) },
    );
    assertions += apolloExpect(isbnRes2, 'data', { isIsbnAvailable: false });

    // prompt error with duplicated ISBN
    const addRevisionRes2 = await apolloTestServer.executeOperation(
      {
        query: ADD_BOOK_REVISION,
        variables: { id: newId, revision: { rev: FAKE, isbn, year: 2020, ...(prob(0.5) && { listPrice: 1000 }) } },
      },
      { contextValue: apolloContext(user) },
    );
    assertions += apolloExpect(addRevisionRes2, 'error', `MSG_CODE#${MSG_ENUM.DUPLICATED_ISBN}`);

    // addRevisionImage
    const addRevisionImageRes = await apolloTestServer.executeOperation(
      { query: ADD_BOOK_REVISION_IMAGE, variables: { id: newId, subId: revisionId, url } },
      { contextValue: apolloContext(user) },
    );
    assertions += apolloExpect(addRevisionImageRes, 'data', {
      addBookRevisionImage: {
        ...expectedFormat,
        revisions: [{ ...expectRevisionFormat, _id: revisionId, imageUrls: [url] }],
      },
    });

    // removeRevisionImage
    const removeRevisionImageRes = await apolloTestServer.executeOperation(
      { query: REMOVE_BOOK_REVISION_IMAGE, variables: { id: newId, subId: revisionId, url } },
      { contextValue: apolloContext(user) },
    );
    assertions += apolloExpect(removeRevisionImageRes, 'data', {
      removeBookRevisionImage: {
        ...expectedFormat,
        revisions: [{ ...expectRevisionFormat, _id: revisionId, imageUrls: [`${CONTENT_PREFIX.BLOCKED}#${url}`] }],
      },
    });

    // removeRevision
    const removeRevisionRes = await apolloTestServer.executeOperation(
      {
        query: REMOVE_BOOK_REVISION,
        variables: { id: newId, subId: revisionId, ...(prob(0.5) && { remark: FAKE2 }) },
      },
      { contextValue: apolloContext(user) },
    );
    assertions += apolloExpect(removeRevisionRes, 'data', {
      removeBookRevision: {
        ...expectedFormat,
        revisions: [{ ...expectRevisionFormat, _id: revisionId, deletedAt: expectedDateFormat(true) }],
      },
    });

    // delete newly created document
    const removedRes = await apolloTestServer.executeOperation(
      { query: REMOVE_BOOK, variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    assertions += apolloExpect(removedRes, 'data', { removeBook: { code: MSG_ENUM.COMPLETED } });

    // clean-up
    await Promise.all([
      jestRemoveObject(url),
      !isAdmin && User.deleteOne({ _id: publisherAdmin._id }),
      !isAdmin && Publisher.updateOne({ _id: publisher }, { $pull: { admins: publisherAdmin._id } }),
    ]);

    expect.assertions(assertions);
  };

  test('should pass when ADD, ADD_REMARK, UPDATE, ADD_REVISION, REMOVE_REVISION & DELETE (as admin)', async () =>
    combinedTest(true));

  test('should pass when ADD, ADD_REMARK, UPDATE, ADD_REVISION, REMOVE_REVISION & DELETE (as publisherAdmin)', async () =>
    combinedTest(false));

  test('should fail when ADD without required fields', async () => {
    expect.assertions(4);

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

    // add without publisher
    const res1 = await apolloTestServer.executeOperation(
      { query: ADD_BOOK, variables: { book: { level, subjects, title: FAKE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res1, 'errorContaining', 'Field "publisher" of required type "String!" was not provided.');

    // add without level
    const res2 = await apolloTestServer.executeOperation(
      { query: ADD_BOOK, variables: { book: { publisher, subjects, title: FAKE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res2, 'errorContaining', 'Field "level" of required type "String!" was not provided.');

    // add without subjects
    const res3 = await apolloTestServer.executeOperation(
      { query: ADD_BOOK, variables: { book: { publisher, level, title: FAKE } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res3, 'errorContaining', 'Field "subjects" of required type "[String!]!" was not provided.');

    // add without title
    const res4 = await apolloTestServer.executeOperation(
      { query: ADD_BOOK, variables: { book: { publisher, level, subjects } } },
      { contextValue: apolloContext(jest.adminUser) },
    );
    apolloExpect(res4, 'errorContaining', 'Field "title" of required type "String!" was not provided.');
  });
});
