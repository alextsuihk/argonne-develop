/**
 * apollo typeDef: Role
 */

export default `#graphql
  extend type Query {
    role(id: ID!): [String!]!
  }

  extend type Mutation {
    addRole(id: ID!, role: String): [String!]!
    removeRole(id: ID!, role: String): [String!]!
  }
`;
