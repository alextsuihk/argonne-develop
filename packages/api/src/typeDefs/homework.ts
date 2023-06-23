/**
 * Apollo TypeDef: Homework
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    homework(id: ID!): Homework
    homeworks(query: QueryInput): [Homework!]!
  }

  extend type Mutation {
    recallHomeworkContent(id: ID!, contentId: String!): Homework!
    updateHomework(id: ID!, answer: String, content: String, timeSpent: Int, viewedExample: Int): Homework
  }

  type Homework {
    _id: ID!
    flags: [String!]!
    assignment: HomeworkAssignment!
    user: String!
    assignmentIdx: Int!
    dynParamIdx: Int

    timeSpent: Int
    viewedExamples: [Int!]!
    scores: [Int!]!

    questions: [String!]!

    createdAt: Float!
    updatedAt: Float!

    contentsToken: String!
  }

  type HomeworkAssignment {
    _id: ID!
    flags: [String!]!
    classroom: String!
    chapter: String
    title: String
    deadline: Float!

    bookAssignments: [BookAssignment!]!
    manualAssignments: [String!]!
    maxScores: [Int!]!

    createdAt: Float!
    updatedAt: Float!
  }
`;
