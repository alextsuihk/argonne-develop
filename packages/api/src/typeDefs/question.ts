/**
 * apollo typeDef: Question
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    question(id: ID!): Question
    questions(query: QueryInput): [Question!]!
  }

  extend type Mutation {
    addQuestion(
      tenantId: String!
      userIds: [String!]!

      deadline: DateInput
      classroom: String
      level: String!
      subject: String!
      book: String
      bookRev: String
      chapter: String
      assignmentIdx: Int
      dynParamIdx: Int
      homework: String
      lang: String!

      price: Int
      content: String!
    ): Question!

    addQuestionBidContent(id: ID!, content: String!, userId: String!): Question!
    addQuestionBidders(id: ID!, userIds: [String!]!): Question!
    addQuestionContentByStudent(id: ID!, content: String!, visibleAfter: DateInput): Question!
    addQuestionContentByTutor(id: ID!, content: String!, visibleAfter: DateInput, timeSpent: Int): Question!
    addQuestionContentWithDispute(id: ID!, content: String!, visibleAfter: DateInput): Question!
    assignQuestionTutor(id: ID!, userId: String!): Question!
    clearQuestionFlag(id: ID!, flag: String!): Question!
    closeQuestion(id: ID!): Question!
    cloneQuestion(id: ID!, userIds: [String!]!): Question!
    removeQuestion(id: ID!): StatusResponse!
    setQuestionFlag(id: ID!, flag: String!): Question!
    updateQuestionLastViewedAt(id: String!, timestamp: DateInput): Question!
  }

  type Question {
    _id: ID!
    flags: [String!]!

    tenant: String!
    parent: String

    student: String!
    tutor: String
    marshals: [String!]!

    members: [Member!]!
    deadline: Float!

    classroom: String
    level: String!
    subject: String!
    book: String
    bookRev: String
    chapter: String
    assignmentIdx: Int
    dynParamIdx: Int
    homework: String

    lang: String!

    contents: [String!]!
    timeSpent: Int

    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float

    price: Int
    bidders: [String!]!
    bidContents: [[String!]]!
    paidAt: Float

    correctness: Int!
    explicitness: Int!
    punctuality: Int!

    contentsToken: String!
  }
`;
