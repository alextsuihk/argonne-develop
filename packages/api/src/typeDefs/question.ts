/**
 * apollo typeDef: Question
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    question(id: ID!): Question
    questions(query: QueryInput): [Question!]!
    # questionsSearch(search: String!): [Question!]! # TODO
  }

  extend type Mutation {
    addQuestion(tenantId: String!, question: QuestionInput!): Question!

    bidQuestion(
      id: ID!
      bidderIds: [String!]!
      bidId: String!
      message: String!
      price: Int
      accept: Boolean
    ): Question!
    removeQuestion(id: ID!): StatusResponse!
    updateQuestion(id: String!, content: String, timeSpent: Int, ranking: Int, pay: Boolean, shareTo: String): Question!
  }

  input QuestionInput {
    tenantId: String
    tutors: [String!]!
    deadline: Float!
    classroom: String
    level: String!
    subject: String!
    book: String
    bookRev: String
    chapter: String
    assignmentIdx: String
    dynParamIdx: String

    homework: String
    lang: String!

    price: Int
    content: String!
  }

  input QuestionBidInput {
    id: ID!
    bidders: [String!]!
    bidId: String!
    message: String!
    price: Int
    accept: Boolean
  }

  type Question {
    _id: ID!
    flags: [String!]!

    tenant: String!
    students: [String!]!
    tutors: [String!]

    members: [Member!]!
    deadline: Float!

    classroom: String
    level: String!
    subject: String!
    book: String
    bookRev: String
    chapter: String
    assignmentIdx: String
    dynParamIdx: String

    lang: String!

    content: Content!
    contents: [Content!]!

    timeSpent: Int

    createdAt: Float!
    updatedAt: Float!

    price: Int
    bidders: [String!]!
    bids: [Bid!]!
    paidAt: Float
  }

  type Bid {
    _id: ID!
    messages: [BidMessage!]!
  }

  type BidMessage {
    creator: String!
    data: Content!
    createdAt: Float!
  }
`;
