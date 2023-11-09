/**
 * apollo typeDef: Job
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    job(id: ID!): Job
    jobs(query: QueryInput): [Job!]!
  }

  extend type Mutation {
    removeJob(id: ID!, remark: String): Job!
  }

  type Job {
    _id: ID!
    flags: [String!]!
    status: String!
    task: String!
    grade: JobGrade
    report: JobReport

    priority: Int!
    startAfter: Float!
    attempt: Int!
    startedAt: Float
    progress: Int!
    completedAt: Float
    result: String

    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }

  type JobGrade {
    tenantId: String!
    assignmentId: String!
  }

  type JobReport {
    tenantId: String!
    file: String!
    arg: String
  }
`;
