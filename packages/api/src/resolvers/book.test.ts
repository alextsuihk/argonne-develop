/**
 * Jest: /resolvers/book
 *
 */

import 'jest-extended';

import { CONTENT_PREFIX, LOCALE } from '@argonne/common';

import {
  apolloExpect,
  ApolloServer,
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
  testServer,
} from '../jest';
import Book, { BookAssignment } from '../models/book';
import Level from '../models/level';
import Publisher from '../models/publisher';
import School from '../models/school';
import Subject from '../models/subject';
import type { Id, UserDocument } from '../models/user';
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
  let adminServer: ApolloServer | null;
  let adminUser: (UserDocument & Id) | null;
  let guestServer: ApolloServer | null;
  let normalUsers: (UserDocument & Id)[] | null;
  let normalServer: ApolloServer | null;
  let url: string | undefined;

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

  const expectedAssignmentFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    contribution: expectedContributionFormat,
    chapter: expect.any(String),
    content: expectedIdFormat,
    dynParams: expect.any(Array),
    solutions: expect.any(Array),
    examples: expect.any(Array),
    remarks: expect.any(Array),
    createdAt: expectedDateFormat(true),
    updatedAt: expectedDateFormat(true),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
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
    contribution: expectedContributionFormat,
    chapter: expect.any(String),
    deletedAt: expect.toBeOneOf([null, expectedDateFormat(true)]),
  };

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer, normalUsers } = await jestSetup(
      ['admin', 'guest', 'normal'],
      { apollo: true },
    ));
  });

  afterAll(async () => jestTeardown());

  afterEach(async () => url && jestRemoveObject(url));

  test('should response a single object when GET All & GET One by ID (as non-Admin, non-teacher & non publishAdmin)', async () => {
    expect.assertions(2);

    const teacherLevel = await Level.findOne({ code: 'TEACHER' }).lean();
    const nonTeacher = normalUsers!.find(
      ({ schoolHistories }) => schoolHistories[0] && !schoolHistories[0].level.equals(teacherLevel!._id),
    );
    if (!nonTeacher) throw 'no valid non-teacher for testing';

    // Get all
    const resAll = await testServer(nonTeacher).executeOperation({ query: GET_BOOKS });
    apolloExpect(resAll, 'data', {
      books: expect.arrayContaining([
        { ...expectedFormat, remarks: [], assignments: expect.arrayContaining([expectedAssignmentFormat]) },
      ]),
    });

    // Get One
    const books = await Book.find({ deletedAt: { $exists: false } }).lean();
    const resOne = await testServer(nonTeacher).executeOperation({
      query: GET_BOOK,
      variables: { id: randomItem(books)._id.toString() },
    });
    apolloExpect(resOne, 'data', {
      book: { ...expectedFormat, remarks: [], assignments: expect.arrayContaining([expectedAssignmentFormat]) },
    });
  });

  test('should response a single object when GET One by ID [with assignments solution] (as teacher)', async () => {
    expect.assertions(1);

    const bookAssignments = await BookAssignment.find({ solutions: { $ne: [] } }).lean();
    const [books, teacherLevel] = await Promise.all([
      Book.find({ assignments: { $in: bookAssignments } }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    const teacher = normalUsers!.find(({ schoolHistories }) => schoolHistories[0]?.level.equals(teacherLevel!._id));
    if (!teacher) throw 'no valid teacher for testing';

    const id = randomItem(books)._id.toString();
    const res = await testServer(teacher).executeOperation({ query: GET_BOOK, variables: { id } });
    apolloExpect(res, 'data', {
      book: {
        ...expectedFormat,
        remarks: [],
        assignments: expect.arrayContaining([
          { ...expectedAssignmentFormat, solutions: expect.arrayContaining([expect.any(String)]) },
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
    const res = await normalServer!.executeOperation({ query: GET_BOOK });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await normalServer!.executeOperation({ query: GET_BOOK, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
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
    const res = await normalServer!.executeOperation({
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
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // add remark
    const book = await Book.findOne().lean();
    const res2 = await normalServer!.executeOperation({
      query: ADD_BOOK_REMARK,
      variables: { id: book!._id.toString(), remark: FAKE },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);
  });

  // test set for admin or publisherAdmin
  const combinedTest = async (isAdmin: boolean) => {
    expect.assertions(isAdmin ? 15 : 10);

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

    const [isbn, server] = isAdmin ? [FAKE, adminServer!] : [FAKE2, testServer(publisherAdmin)];
    url = await jestPutObject(isAdmin ? adminUser!._id : publisherAdmin._id);

    // add a document
    const subject1 = randomItem(allSubjects);
    const create = {
      publisher,
      level: randomItem(subject1.levels).toString(),
      subjects: [subject1._id.toString()],
      title: FAKE,
      ...(prob(0.5) && { subTitle: FAKE }),
    };
    const createdRes = await server.executeOperation({
      query: ADD_BOOK,
      variables: { book: create },
    });
    apolloExpect(createdRes, 'data', { addBook: { ...expectedFormat, ...create } });
    const newId: string = createdRes.data!.addBook._id;

    // update newly created document
    const subject2 = randomItem(allSubjects);
    const update = {
      publisher,
      level: randomItem(subject2.levels).toString(),
      subjects: [subject2._id.toString()],
      title: FAKE2,
      ...(prob(0.5) && { subTitle: FAKE2 }),
    };
    const updatedRes = await server.executeOperation({
      query: UPDATE_BOOK,
      variables: { id: newId, book: update },
    });
    apolloExpect(updatedRes, 'data', { updateBook: { ...expectedFormat, ...update } });

    if (isAdmin) {
      // addRemark (admin ONLY)
      const addRemarkRes = await adminServer!.executeOperation({
        query: ADD_BOOK_REMARK,
        variables: { id: newId, remark: FAKE },
      });
      apolloExpect(addRemarkRes, 'data', {
        addBookRemark: { ...expectedFormat, ...expectedRemark(adminUser!._id, FAKE, true) },
      });

      // addAssignment (admin ONLY)
      const addAssignmentRes = await adminServer!.executeOperation({
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
      });
      apolloExpect(addAssignmentRes, 'data', {
        addBookAssignment: {
          ...expectedFormat,
          assignments: [
            { ...expectedAssignmentFormat, chapter: FAKE, dynParams: ['A', 'B', 'C'], solutions: ['AA', 'BB', 'CC'] },
          ],
        },
      });
      const assignmentId = addAssignmentRes.data!.addBookAssignment.assignments[0]._id.toString();

      // removeAssignment (admin ONLY)
      const removeAssignmentRes = await adminServer!.executeOperation({
        query: REMOVE_BOOK_ASSIGNMENT,
        variables: { id: newId, assignmentId, ...(prob(0.5) && { remark: FAKE2 }) },
      });
      apolloExpect(removeAssignmentRes, 'data', {
        removeBookAssignment: {
          ...expectedFormat,
          assignments: [{ ...expectedAssignmentFormat, deletedAt: expectedDateFormat(true) }],
        },
      });

      // addSupplement (admin ONLY)
      const addSupplementRes = await adminServer!.executeOperation({
        query: ADD_BOOK_SUPPLEMENT,
        variables: {
          id: newId,
          supplement: {
            contribution: {
              title: FAKE,
              ...(prob(0.5) && { description: FAKE }),
              contributors: [
                {
                  user: randomItem(normalUsers!)._id.toString(),
                  name: FAKE,
                  school: randomItem(allSchools)._id.toString(),
                },
              ],
              urls: ['http://github/some-path', 'http://github/some-path-two'],
            },
            chapter: FAKE,
          },
        },
      });
      apolloExpect(addSupplementRes, 'data', {
        addBookSupplement: { ...expectedFormat, supplements: [{ ...expectedSupplementFormat, chapter: FAKE }] },
      });
      const supplementId = addSupplementRes.data!.addBookSupplement.supplements[0]._id.toString();

      // removeSupplement (admin ONLY)
      const removeSupplementRes = await adminServer!.executeOperation({
        query: REMOVE_BOOK_SUPPLEMENT,
        variables: { id: newId, supplementId, ...(prob(0.5) && { remark: FAKE2 }) },
      });
      apolloExpect(removeSupplementRes, 'data', {
        removeBookSupplement: {
          ...expectedFormat,
          supplements: [{ ...expectedSupplementFormat, deletedAt: expectedDateFormat(true) }],
        },
      });
    }

    //  check isbn availability
    const isbnRes = await guestServer!.executeOperation({ query: IS_ISBN_AVAILABLE, variables: { isbn } });
    apolloExpect(isbnRes, 'data', { isIsbnAvailable: true });

    // addRevision
    const addRevisionRes = await server.executeOperation({
      query: ADD_BOOK_REVISION,
      variables: {
        id: newId,
        revision: { rev: FAKE, isbn, year: 2020, ...(prob(0.5) && { listPrice: 1000 }) },
      },
    });
    apolloExpect(addRevisionRes, 'data', {
      addBookRevision: { ...expectedFormat, revisions: [{ ...expectRevisionFormat, rev: FAKE, isbn, year: 2020 }] },
    });
    const revisionId = addRevisionRes.data!.addBookRevision.revisions[0]._id.toString();

    // check isbn availability (after revision added)
    const isbnRes2 = await guestServer!.executeOperation({ query: IS_ISBN_AVAILABLE, variables: { isbn } });
    apolloExpect(isbnRes2, 'data', { isIsbnAvailable: false });

    // prompt error with duplicated ISBN
    const addRevisionRes2 = await server.executeOperation({
      query: ADD_BOOK_REVISION,
      variables: { id: newId, revision: { rev: FAKE, isbn, year: 2020, ...(prob(0.5) && { listPrice: 1000 }) } },
    });
    apolloExpect(addRevisionRes2, 'error', `MSG_CODE#${MSG_ENUM.DUPLICATED_ISBN}`);

    // addRevisionImage
    const addRevisionImageRes = await server.executeOperation({
      query: ADD_BOOK_REVISION_IMAGE,
      variables: { id: newId, revisionId, url },
    });
    apolloExpect(addRevisionImageRes, 'data', {
      addBookRevisionImage: {
        ...expectedFormat,
        revisions: [{ ...expectRevisionFormat, _id: revisionId, imageUrls: [url] }],
      },
    });

    // removeRevisionImage
    const removeRevisionImageRes = await server.executeOperation({
      query: REMOVE_BOOK_REVISION_IMAGE,
      variables: { id: newId, revisionId, url },
    });
    apolloExpect(removeRevisionImageRes, 'data', {
      removeBookRevisionImage: {
        ...expectedFormat,
        revisions: [{ ...expectRevisionFormat, _id: revisionId, imageUrls: [`${CONTENT_PREFIX.BLOCKED}#${url}`] }],
      },
    });

    // removeRevision
    const removeRevisionRes = await server.executeOperation({
      query: REMOVE_BOOK_REVISION,
      variables: { id: newId, revisionId, ...(prob(0.5) && { remark: FAKE2 }) },
    });
    apolloExpect(removeRevisionRes, 'data', {
      removeBookRevision: {
        ...expectedFormat,
        revisions: [{ ...expectRevisionFormat, _id: revisionId, deletedAt: expectedDateFormat(true) }],
      },
    });

    // delete newly created document
    const removedRes = await adminServer!.executeOperation({
      query: REMOVE_BOOK,
      variables: { id: newId, ...(prob(0.5) && { remark: FAKE }) },
    });
    apolloExpect(removedRes, 'data', { removeBook: { code: MSG_ENUM.COMPLETED } });

    // clean-up
    if (!isAdmin)
      await Promise.all([
        User.deleteOne({ _id: publisherAdmin }),
        Publisher.updateOne({ _id: publisher }, { $pull: { admins: publisherAdmin._id } }),
      ]);
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
    const res1 = await adminServer!.executeOperation({
      query: ADD_BOOK,
      variables: { book: { level, subjects, title: FAKE } },
    });
    apolloExpect(res1, 'errorContaining', 'Field "publisher" of required type "String!" was not provided.');

    // add without level
    const res2 = await adminServer!.executeOperation({
      query: ADD_BOOK,
      variables: { book: { publisher, subjects, title: FAKE } },
    });
    apolloExpect(res2, 'errorContaining', 'Field "level" of required type "String!" was not provided.');

    // add without subjects
    const res3 = await adminServer!.executeOperation({
      query: ADD_BOOK,
      variables: { book: { publisher, level, title: FAKE } },
    });
    apolloExpect(res3, 'errorContaining', 'Field "subjects" of required type "[String!]!" was not provided.');

    // add without title
    const res4 = await adminServer!.executeOperation({
      query: ADD_BOOK,
      variables: {
        book: { publisher, level, subjects },
      },
    });
    apolloExpect(res4, 'errorContaining', 'Field "title" of required type "String!" was not provided.');
  });
});
