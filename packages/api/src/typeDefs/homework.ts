/**
 * Apollo TypeDef: Homework
 */

export default `#graphql
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
    # _id: ID! # one-to-one relationship, no need to normalize, just nest it
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
