/**
 * Apollo TypeDef: User
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    user(id: ID!): User
    users(query: QueryInput): [User!]!
  }

  extend type Mutation {
    addUser(tenantId: String, email: String!, name: String!, studentId: String): User!
    addUserFeature(id: ID!, feature: String!): User!
    addUserRemark(id: ID!, remark: String!): User!
    addUserSchoolHistory(id: ID!, year: String!, level: String!, schoolClass: String): User!
    changeUserPassword(id: ID!, password: String!): StatusResponse!
    clearUserFlag(id: ID!, flag: String!): User!
    removeUserFeature(id: ID!, feature: String!): User!
    setUserFlag(id: ID!, flag: String!): User!
    suspendUser(id: ID!): User!
    updateUserIdentifiedAt(id: ID!): User!
  }

  type User {
    _id: ID!
    flags: [String!]!

    tenants: [String!]!
    status: String!
    name: String!
    formalName: Locale
    emails: [String!]!
    features: [String!]!

    avatarUrl: String

    violations: [UserViolation!]!
    suspendUtil: Float
    identifiedAt: Float

    studentIds: [String!]!
    schoolHistories: [UserSchoolHistory]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
