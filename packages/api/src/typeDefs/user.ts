/**
 * Apollo TypeDef: User
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    user(id: ID!): User
    users(query: QueryInput): [User!]!
  }

  extend type Mutation {
    addUser(tenantId: String!, email: String!): User!
    addUserFeature(id: ID!, feature: String!): User!
    addUserSchoolHistory(id: ID!, tenantId: String!, year: String!, level: String!, schoolClass: String!): User!
    changeUserPassword(id: ID!, password: String!): StatusResponse!
    clearUserFlag(id: ID!, flag: String!): User!
    removeUserFeature(id: ID!, feature: String!): User!
    setUserFlag(id: ID!, flag: String!): User!
    suspendUser(id: ID!): User!
    updateIdentifiedAt(userId: String!): User!
  }

  type User {
    _id: ID!
    flags: [String!]!

    tenants: [String!]!
    name: String!
    formalName: Locale
    emails: [String!]!

    avatarUrl: String

    studentIds: [String!]!
    schoolHistories: [UserSchoolHistory]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
