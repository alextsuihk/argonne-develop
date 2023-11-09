/**
 * Apollo TypeDef: Assignment
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    assignment(id: ID!): Assignment
    assignments(query: QueryInput): [Assignment!]!
  }

  extend type Mutation {
    addAssignment(assignment: AssignmentInput!): Assignment!
    gradeAssignment(id: ID!, homeworkId: String!, content: String, score: Int): Assignment!
    removeAssignment(id: ID!, remark: String): StatusResponse!
    updateAssignment(id: ID!, deadline: DateInput!): Assignment
  }

  input AssignmentInput {
    classroom: String!
    flags: [String!]!
    chapter: String
    title: String
    deadline: DateInput!
    questions: [String!]!
    maxScores: [Int]!
    homeworks: [AssignmentHomeworkInput!]!
  }

  input AssignmentHomeworkInput {
    user: String!
    assignmentIdx: Int!
    dynParamIdx: Int
  }

  type Assignment {
    _id: ID!
    flags: [String!]!
    classroom: String!
    chapter: String
    title: String
    deadline: Float!

    bookAssignments: [BookAssignment!]!
    manualAssignments: [String!]!
    maxScores: [Int!]!

    job: String
    homeworks: [AssignmentHomework!]!

    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float

    contentsToken: String!
  }

  type AssignmentHomework {
    _id: String!
    flags: [String!]!

    user: String!
    assignmentIdx: Int!
    dynParamIdx: Int

    contents: [String!]!
    answer: String
    answeredAt: Float

    timeSpent: Int
    viewedExamples: [Int!]
    scores: [Int!]!

    questions: [String!]!

    createdAt: Float!
    updatedAt: Float!
  }
`;
