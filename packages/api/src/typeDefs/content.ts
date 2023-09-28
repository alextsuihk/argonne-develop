/**
 * Apollo TypeDef: Content
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    contents(token: String!, ids: [String!], query: QueryInput): Content
  }

  extend type Mutation {
    _: String # empty entry
  }

  type Content {
    _id: ID!
    flags: [String!]!
    parents: [String!]!
    creator: String!
    data: String!
    createdAt: Float!
    updatedAt: Float!
  }
`;
