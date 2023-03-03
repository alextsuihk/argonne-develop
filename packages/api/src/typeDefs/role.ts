/**
 * apollo typeDef: Role
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    role(id: ID!): [String!]!
  }

  extend type Mutation {
    addRole(id: ID!, role: String): [String!]!
    removeRole(id: ID!, role: String): [String!]!
  }
`;
