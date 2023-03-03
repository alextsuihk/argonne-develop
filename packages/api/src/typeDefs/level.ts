/**
 * apollo typeDef: Level
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    level(id: ID!): Level @cacheControl(maxAge: 3600)
    levels(query: QueryInput): [Level!]! @cacheControl(maxAge: 3600)
  }

  extend type Mutation {
    addLevel(level: LevelInput!): Level!
    addLevelRemark(id: ID!, remark: String!): Level!
    removeLevel(id: ID!, remark: String): StatusResponse!
    updateLevel(id: ID!, level: LevelInput!): Level!
  }

  input LevelInput {
    code: String!
    name: LocaleInput!
  }

  type Level {
    _id: ID!
    flags: [String!]!
    code: String!
    name: Locale!
    nextLevel: String
    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
