/**
 * Apollo TypeDef: Assignment
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    assignment(id: ID!): Assignment
    assignments(query: QueryInput): [Assignment!]!
  }

  extend type Mutation {
    addAssignment(assignment: AssignmentInput!): Assignment!
    removeAssignment(id: ID!, remark: String): StatusResponse!
    updateAssignment(
      id: ID!
      homeworkId: String!
      content: String
      answer: String
      timeSpent: Int
      score: Int
      viewExample: Int
      shareTo: String
    ): Assignment
  }

  input AssignmentInput {
    classroom: String!
    flags: [String!]!
    chapter: String
    title: String
    deadline: Float!
    questions: [String!]!
    maxScores: [Int]!
    homeworks: [HomeworkInput!]!
  }

  input HomeworkInput {
    user: String!
    assignmentIdx: Int!
    dynParamIdx: Int
  }

  type Assignment {
    _id: ID!
    flags: [String!]!
    classroom: String
    chapter: String!
    title: String
    deadline: Float!

    bookAssignments: [BookAssignment!]!

    createdAt: Float!
    updatedAt: Float!
  }

  type Homework {
    _id: ID!
    user: String!
    assignmentIdx: Int!
    dynParamIdx: Int
    contents: [String!]!
    answer: String
    answeredAt: Float
    timeSpent: Int
    viewedExamples: [Int!]
    score: Int

    createdAt: Float!
    updatedAt: Float!
  }
`;
