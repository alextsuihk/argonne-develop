/**
 * Jest: /resolvers/book
 *
 */

import 'jest-extended';

import { CONTENT_PREFIX, LOCALE } from '@argonne/common';
import type { LeanDocument } from 'mongoose';

import {
  apolloExpect,
  ApolloServer,
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
  randomString,
  shuffle,
  testServer,
} from '../jest';
import Book from '../models/book';
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
  JOIN_BOOK_CHAT,
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
  let adminUser: LeanDocument<UserDocument> | null;
  let guestServer: ApolloServer | null;
  let normalUsers: LeanDocument<UserDocument>[] | null;
  let normalServer: ApolloServer | null;
  let url: string; // test as admin

  const expectedFormat = {
    _id: expectedIdFormat,
    flags: expect.any(Array),
    publisher: expect.any(String),
    level: expect.any(String),
    subjects: expect.arrayContaining([expect.any(String)]),
    title: expect.any(String),
    subTitle: expect.toBeOneOf([null, expect.any(String)]),
    chatGroup: expect.any(String),
    assignments: null,
    supplements: expect.any(Array),
    revisions: expect.any(Array),
    remarks: null,
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  const expectedAssignmentFormat = {
    _id: expectedIdFormat,
    contribution: expectedContributionFormat,
    chapter: expect.any(String),
    content: expectedContentFormat,
    dynParams: expect.arrayContaining([expect.any(String)]),
    solutions: expect.arrayContaining([expect.any(String)]),
    examples: expect.any(Array),
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  const expectedSupplementFormat = {
    _id: expectedIdFormat,
    contribution: expectedContributionFormat,
    chapter: expect.any(String),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  const expectRevisionFormat = {
    _id: expectedIdFormat,
    rev: expect.any(String),
    isbn: expect.toBeOneOf([null, expect.any(String)]),
    year: expect.any(Number),
    imageUrls: expect.any(Array),
    listPrice: expect.toBeOneOf([null, expect.any(Number)]),
    createdAt: expect.any(Number),
    deletedAt: expect.toBeOneOf([null, expect.any(Number)]),
  };

  beforeAll(async () => {
    ({ adminServer, adminUser, guestServer, normalServer, normalUsers } = await jestSetup(
      ['admin', 'guest', 'normal'],
      { apollo: true },
    ));
  });

  afterAll(async () => Promise.all([jestRemoveObject(url), jestTeardown()]));

  test('should response an array of data when GET all', async () => {
    expect.assertions(1);

    const res = await guestServer!.executeOperation({ query: GET_BOOKS });
    apolloExpect(res, 'data', {
      books: expect.arrayContaining([expectedFormat]),
    });
  });

  test('should response a single object when GET One by ID', async () => {
    expect.assertions(1);

    const books = await Book.find({ deletedAt: { $exists: false } }).lean();
    const id = randomId(books);
    const res = await guestServer!.executeOperation({ query: GET_BOOK, variables: { id } });
    apolloExpect(res, 'data', { book: expectedFormat });
  });

  test('should response a single object when GET One by ID [with assignments & supplements] (as teacher)', async () => {
    expect.assertions(1);

    const [books, teacherLevel] = await Promise.all([
      Book.find({
        'assignments.0': { $exists: true },
        'supplements.0': { $exists: true },
        deletedAt: { $exists: false },
      }).lean(),
      Level.findOne({ code: 'TEACHER' }).lean(),
    ]);

    if (!books.length || !teacherLevel)
      throw 'teacherLevel & a book (with assignments and supplements) are needed for testing.';

    const teacher = normalUsers!.find(
      ({ histories }) => histories[0]?.level.toString() === teacherLevel!._id.toString(),
    )!;

    const res = await testServer(teacher).executeOperation({ query: GET_BOOK, variables: { id: randomId(books) } });
    apolloExpect(res, 'data', {
      book: {
        ...expectedFormat,
        assignments: expect.arrayContaining([expectedAssignmentFormat]),
        supplements: expect.arrayContaining([expectedSupplementFormat]),
      },
    });
  });

  test('should fail when GET non-existing document without ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_BOOK });
    apolloExpect(res, 'error', 'Variable "$id" of required type "ID!" was not provided.');
  });

  test('should fail when GET non-existing document without valid Mongo ID argument', async () => {
    expect.assertions(1);
    const res = await guestServer!.executeOperation({ query: GET_BOOK, variables: { id: 'invalid-mongoID' } });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.INVALID_ID}`);
  });

  test('should fail when mutating without ADMIN role & non-publisher', async () => {
    expect.assertions(2);

    // add a document
    const [publishers, subjects] = await Promise.all([
      Publisher.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
    ]);

    if (!subjects.length || !publishers.length)
      throw `At least one subject & one publisher are required/ ${subjects.length} subjects, and ${publishers.length} publishers.`;

    const [subject] = subjects.sort(shuffle);
    const res = await normalServer!.executeOperation({
      query: ADD_BOOK,
      variables: {
        book: {
          publisher: randomId(publishers),
          level: randomId(subject.levels),
          subjects: [subject._id.toString()],
          title: FAKE,
          ...(prob(0.5) && { subTitle: FAKE }),
        },
      },
    });
    apolloExpect(res, 'error', `MSG_CODE#${MSG_ENUM.UNAUTHORIZED_OPERATION}`);

    // add remark (admin ONLY)
    const book = await Book.findOne().lean();
    const res2 = await normalServer!.executeOperation({
      query: ADD_BOOK_REMARK,
      variables: { id: book!._id.toString(), remark: FAKE },
    });
    apolloExpect(res2, 'error', `MSG_CODE#${MSG_ENUM.AUTH_REQUIRE_ROLE_ADMIN}`);
  });

  // test set for admin or publisherAdmin
  const combinedTest = async (isAdmin: boolean) => {
    expect.assertions(isAdmin ? 16 : 11);

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
    const [pub] = allPublishers.sort(shuffle);
    const publisher = pub._id.toString();

    const publisherAdmin = new User<Partial<UserDocument>>({
      name: 'publisherAdmin',
      emails: [`publishAdmin@${randomString()}.com`],
      password: User.genValidPassword(),
    });

    if (!isAdmin)
      await Promise.all([
        publisherAdmin.save(),
        Publisher.findByIdAndUpdate(publisher, { $push: { admins: publisherAdmin._id } }).lean(),
      ]);

    const [isbn, server, expected] = isAdmin
      ? [FAKE, adminServer!, { ...expectedFormat, assignments: expect.any(Array), remarks: expect.any(Array) }]
      : [FAKE2, testServer(publisherAdmin), expectedFormat];

    url = await jestPutObject(isAdmin ? adminUser! : publisherAdmin);

    // add a document
    const createdRes = await server.executeOperation({
      query: ADD_BOOK,
      variables: { book: { publisher, level, subjects, title: FAKE, ...(prob(0.5) && { subTitle: FAKE }) } },
    });
    apolloExpect(createdRes, 'data', {
      addBook: { ...expected, assignments: [], remarks: [], publisher, level, subjects, title: FAKE },
    });
    const newId: string = createdRes.data!.addBook._id;

    // update newly created document
    const updatedRes = await server.executeOperation({
      query: UPDATE_BOOK,
      variables: {
        id: newId,
        book: { publisher, level, subjects, title: FAKE2, ...(prob(0.5) && { subTitle: FAKE2 }) },
      },
    });
    apolloExpect(updatedRes, 'data', { updateBook: { ...expected, publisher, level, subjects, title: FAKE2 } });

    if (isAdmin) {
      // addRemark (admin ONLY)
      const addRemarkRes = await adminServer!.executeOperation({
        query: ADD_BOOK_REMARK,
        variables: { id: newId, remark: FAKE },
      });
      apolloExpect(addRemarkRes, 'data', { addBookRemark: { ...expected, ...expectedRemark(adminUser!, FAKE, true) } });

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
        addBookAssignment: { ...expected, assignments: [expectedAssignmentFormat] },
      });
      const assignmentId = addAssignmentRes.data!.addBookAssignment.assignments[0]._id.toString();

      // removeAssignment (admin ONLY)
      const removeAssignmentRes = await adminServer!.executeOperation({
        query: REMOVE_BOOK_ASSIGNMENT,
        variables: { id: newId, assignmentId, ...(prob(0.5) && { remark: FAKE2 }) },
      });
      apolloExpect(removeAssignmentRes, 'data', {
        removeBookAssignment: {
          ...expected,
          assignments: [{ ...expectedAssignmentFormat, deletedAt: expect.any(Number) }],
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
              contributors: [{ user: randomId(normalUsers!), name: FAKE, school: randomId(allSchools) }],
              urls: ['http://github/some-path', 'http://github/some-path-two'],
            },
            chapter: FAKE,
          },
        },
      });
      apolloExpect(addSupplementRes, 'data', {
        addBookSupplement: { ...expected, supplements: [expectedSupplementFormat] },
      });
      const supplementId = addSupplementRes.data!.addBookSupplement.supplements[0]._id.toString();

      // removeSupplement (admin ONLY)
      const removeSupplementRes = await adminServer!.executeOperation({
        query: REMOVE_BOOK_SUPPLEMENT,
        variables: { id: newId, supplementId, ...(prob(0.5) && { remark: FAKE2 }) },
      });
      apolloExpect(removeSupplementRes, 'data', {
        removeBookSupplement: {
          ...expected,
          supplements: [{ ...expectedSupplementFormat, deletedAt: expect.any(Number) }],
        },
      });
    }

    // joinChat
    const teacher = normalUsers!.find(
      ({ histories }) => histories[0]?.level.toString() === teacherLevel!._id.toString(),
    )!;
    const joinBookChatRes = await testServer(teacher).executeOperation({
      query: JOIN_BOOK_CHAT,
      variables: { id: newId },
    });
    apolloExpect(joinBookChatRes, 'data', { joinBookChat: { code: MSG_ENUM.COMPLETED } });

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
      addBookRevision: { ...expected, revisions: [{ ...expectRevisionFormat, rev: FAKE, isbn, year: 2020 }] },
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
        ...expected,
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
        ...expected,
        revisions: [{ ...expectRevisionFormat, _id: revisionId, imageUrls: [`${CONTENT_PREFIX.BLOCKED}${url}`] }],
      },
    });

    // removeRevision
    const removeRevisionRes = await server.executeOperation({
      query: REMOVE_BOOK_REVISION,
      variables: { id: newId, revisionId, ...(prob(0.5) && { remark: FAKE2 }) },
    });
    apolloExpect(removeRevisionRes, 'data', {
      removeBookRevision: {
        ...expected,
        revisions: [{ ...expectRevisionFormat, _id: revisionId, deletedAt: expect.any(Number) }],
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
        Publisher.findByIdAndUpdate(publisher, { $pull: { admins: publisherAdmin._id } }).lean(),
      ]);
  };

  test('should pass when ADD, JOIN_CHAT, ADD_REMARK, UPDATE, ADD_REVISION, REMOVE_REVISION & DELETE (as admin)', async () =>
    combinedTest(true));

  test('should pass when ADD, ADD_REMARK, UPDATE, ADD_REVISION, REMOVE_REVISION & DELETE (as publisherAdmin)', async () =>
    combinedTest(false));

  test('should fail when ADD without required fields', async () => {
    expect.assertions(4);

    const [publishers, subjects] = await Promise.all([
      Publisher.find({ deletedAt: { $exists: false } }).lean(),
      Subject.find({ deletedAt: { $exists: false } }).lean(),
    ]);

    if (!subjects.length || !publishers.length)
      throw `At least one subject & one publisher are required/ ${subjects.length} subjects, and ${publishers.length} publishers.`;

    const [subject] = subjects.sort(shuffle);
    const subjectId = subject._id.toString();
    const publisherId = randomId(publishers);
    const levelId = randomId(subject.levels);

    // add without publisher
    const res1 = await adminServer!.executeOperation({
      query: ADD_BOOK,
      variables: { book: { level: levelId, subjects: [subjectId], title: FAKE } },
    });
    apolloExpect(res1, 'errorContaining', 'Field "publisher" of required type "String!" was not provided.');

    // add without level
    const res2 = await adminServer!.executeOperation({
      query: ADD_BOOK,
      variables: { book: { publisher: publisherId, subjects: [subjectId], title: FAKE } },
    });
    apolloExpect(res2, 'errorContaining', 'Field "level" of required type "String!" was not provided.');

    // add without subjects
    const res3 = await adminServer!.executeOperation({
      query: ADD_BOOK,
      variables: { book: { publisher: publisherId, level: levelId, title: FAKE } },
    });
    apolloExpect(res3, 'errorContaining', 'Field "subjects" of required type "[String!]!" was not provided.');

    // add without title
    const res4 = await adminServer!.executeOperation({
      query: ADD_BOOK,
      variables: {
        book: { publisher: publisherId, level: levelId, subjects: [subjectId] },
      },
    });
    apolloExpect(res4, 'errorContaining', 'Field "title" of required type "String!" was not provided.');
  });
});
