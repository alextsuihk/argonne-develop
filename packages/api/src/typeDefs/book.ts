/**
 * apollo typeDef: Book
 *
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    book(id: ID!): Book @cacheControl(maxAge: 3600)
    books(query: QueryInput): [Book!]! @cacheControl(maxAge: 3600)
    isIsbnAvailable(isbn: String!): Boolean!
  }

  extend type Mutation {
    addBook(book: BookInput!): Book!
    addBookAssignment(id: ID!, assignment: BookAssignmentInput!): Book!
    addBookRemark(id: ID!, remark: String!): Book!
    addBookRevision(id: ID!, revision: BookRevisionInput!): Book!
    addBookRevisionImage(id: ID!, revisionId: String!, url: String!): Book!
    addBookSupplement(id: ID!, supplement: BookSupplementInput!): Book!
    removeBook(id: ID!, remark: String): StatusResponse!
    removeBookAssignment(id: ID!, assignmentId: String!, remark: String): Book!
    removeBookRevision(id: ID!, revisionId: String!, remark: String): Book!
    removeBookRevisionImage(id: ID!, revisionId: String!, url: String!, remark: String): Book!
    removeBookSupplement(id: ID!, supplementId: String!, remark: String): Book!

    updateBook(id: ID!, book: BookInput!): Book!
    # updateBookRevision(id: ID!, revisionId: String!, bookRev: BookRevisionInput!): Book!
  }

  input BookInput {
    publisher: String!
    level: String!
    subjects: [String!]!
    title: String!
    subTitle: String
  }

  input BookAssignmentInput {
    contribution: ContributionInput!
    chapter: String!
    content: String!
    dynParams: [String!]!
    solutions: [String!]!
    examples: [String!]!
  }

  input BookRevisionInput {
    isbn: String
    rev: String!
    year: Int!
    listPrice: Int
  }

  input BookSupplementInput {
    contribution: ContributionInput!
    chapter: String!
  }

  type Book {
    _id: ID!
    flags: [String!]!
    publisher: String!
    level: String!
    subjects: [String!]!
    title: String!
    subTitle: String
    chatGroup: String!

    assignments: [BookAssignment!]!
    supplements: [BookSupplement!]!
    revisions: [BookRevision!]!

    remarks: [Remark!]

    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float

    contentsToken: String!
  }

  type BookAssignment {
    _id: ID!
    flags: [String!]!
    contribution: Contribution!
    chapter: String!
    content: String!
    dynParams: [String!]!
    solutions: [String!]!
    examples: [String!]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }

  type BookRevision {
    _id: String!
    rev: String!
    isbn: String
    year: Int!
    imageUrls: [String!]!
    listPrice: Int
    createdAt: Float!
    deletedAt: Float
  }

  type BookSupplement {
    _id: ID!
    contribution: Contribution!
    chapter: String!
    deletedAt: Float
  }
`;
