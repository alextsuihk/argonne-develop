/**
 * Apollo Query: Book
 *
 */

import { gql } from 'apollo-server-core';

import { REMARK, STATUS_RESPONSE } from './common';
import { CONTRIBUTION_FIELDS } from './contribution';

const BOOK_FIELDS = gql`
  ${CONTRIBUTION_FIELDS}
  ${REMARK}
  fragment BookFields on Book {
    _id
    flags
    publisher
    level
    subjects
    title
    subTitle
    chatGroup

    assignments {
      _id
      flags
      contribution {
        ...ContributionFields
      }
      chapter
      content
      dynParams
      solutions
      examples
      remarks {
        ...RemarkFields
      }
      createdAt
      updatedAt
      deletedAt
    }

    supplements {
      _id
      contribution {
        ...ContributionFields
      }
      chapter
      deletedAt
    }

    revisions {
      _id
      rev
      isbn
      year
      imageUrls
      listPrice
      createdAt
      deletedAt
    }
    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt

    contentsToken
  }
`;

export const ADD_BOOK = gql`
  ${BOOK_FIELDS}
  mutation AddBook($book: BookInput!) {
    addBook(book: $book) {
      ...BookFields
    }
  }
`;

export const ADD_BOOK_ASSIGNMENT = gql`
  ${BOOK_FIELDS}
  mutation AddBookAssignment($id: ID!, $assignment: BookAssignmentInput!) {
    addBookAssignment(id: $id, assignment: $assignment) {
      ...BookFields
    }
  }
`;

export const ADD_BOOK_REMARK = gql`
  ${BOOK_FIELDS}
  mutation AddBookRemark($id: ID!, $remark: String!) {
    addBookRemark(id: $id, remark: $remark) {
      ...BookFields
    }
  }
`;

export const ADD_BOOK_REVISION = gql`
  ${BOOK_FIELDS}
  mutation AddBookRevision($id: ID!, $revision: BookRevisionInput!) {
    addBookRevision(id: $id, revision: $revision) {
      ...BookFields
    }
  }
`;

export const ADD_BOOK_REVISION_IMAGE = gql`
  ${BOOK_FIELDS}
  mutation AddBookRevisionImage($id: ID!, $revisionId: String!, $url: String!) {
    addBookRevisionImage(id: $id, revisionId: $revisionId, url: $url) {
      ...BookFields
    }
  }
`;

export const ADD_BOOK_SUPPLEMENT = gql`
  ${BOOK_FIELDS}
  mutation AddBookSupplement($id: ID!, $supplement: BookSupplementInput!) {
    addBookSupplement(id: $id, supplement: $supplement) {
      ...BookFields
    }
  }
`;

export const IS_ISBN_AVAILABLE = gql`
  query IsIsbnAvailable($isbn: String!) {
    isIsbnAvailable(isbn: $isbn)
  }
`;

export const GET_BOOK = gql`
  ${BOOK_FIELDS}
  query GetBook($id: ID!) {
    book(id: $id) {
      ...BookFields
    }
  }
`;

export const GET_BOOKS = gql`
  ${BOOK_FIELDS}
  query GetBooks($query: QueryInput) {
    books(query: $query) {
      ...BookFields
    }
  }
`;

export const REMOVE_BOOK = gql`
  ${STATUS_RESPONSE}
  mutation RemoveBook($id: ID!, $remark: String) {
    removeBook(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const REMOVE_BOOK_ASSIGNMENT = gql`
  ${BOOK_FIELDS}
  mutation RemoveBookAssignment($id: ID!, $assignmentId: String!, $remark: String) {
    removeBookAssignment(id: $id, assignmentId: $assignmentId, remark: $remark) {
      ...BookFields
    }
  }
`;

export const REMOVE_BOOK_REVISION = gql`
  ${BOOK_FIELDS}
  mutation RemoveBookRevision($id: ID!, $revisionId: String!, $remark: String) {
    removeBookRevision(id: $id, revisionId: $revisionId, remark: $remark) {
      ...BookFields
    }
  }
`;

export const REMOVE_BOOK_REVISION_IMAGE = gql`
  ${BOOK_FIELDS}
  mutation RemoveBookRevisionImage($id: ID!, $revisionId: String!, $url: String!, $remark: String) {
    removeBookRevisionImage(id: $id, revisionId: $revisionId, url: $url, remark: $remark) {
      ...BookFields
    }
  }
`;

export const REMOVE_BOOK_SUPPLEMENT = gql`
  ${BOOK_FIELDS}
  mutation RemoveBookSupplement($id: ID!, $supplementId: String!, $remark: String) {
    removeBookSupplement(id: $id, supplementId: $supplementId, remark: $remark) {
      ...BookFields
    }
  }
`;

export const UPDATE_BOOK = gql`
  ${BOOK_FIELDS}
  mutation UpdateBook($id: ID!, $book: BookInput!) {
    updateBook(id: $id, book: $book) {
      ...BookFields
    }
  }
`;
