/**
 * Apollo TypeDef: Auth (login, register & OAuth2)
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    isEmailAvailable(email: String!): Boolean
    tenantToken(id: ID!, expiresIn: Int): TenantToken!
    user(id: ID!): User
    users(query: QueryInput): [User!]!
  }

  extend type Mutation {
    addEmail(email: String!): User!
    addUser(tenantId: String!, email: String!): User!
    # bindTenant(token: String!): StatusResponse!
    removeEmail(email: String!): User!
    # unbindTenant(id: ID!, userId: String!): StatusResponse!
    updateUserNetworkStatus(networkStatus: String!): User!
    updateUserProfile(user: UserProfileInput!): User!
    updateUserSchool(id: ID!, tenantId: String!, year: String!, level: String!, schoolClass: String!): User!
    verifyEmail(email: String!): StatusResponse!
    verifyId(userId: String!): User!
  }

  input UserProfileInput {
    name: String!
    address: LocaleInput
    district: String!
    locale: String!
    yob: Int
    dob: DateInput
  }

  type ApiKey {
    value: String!
    scope: String!
    note: String
    expireAt: Float!
  }

  type PaymentMethod {
    currency: String!
    type: String!
    bank: String
    account: String!
    payable: Boolean!
    receivable: Boolean!
  }

  type Subscription {
    token: String!
    subscription: String!
    enabled: Boolean!
    permission: String!
    ip: String!
    ua: String!
  }

  type Violation {
    # TODO
    createdAt: Float!
    reason: String!
    links: [String!]!
  }

  type YearLevelClass {
    year: String!
    school: String!
    level: String!
    schoolClass: String
    updatedAt: Float!
  }

  type User {
    _id: ID!
    flags: [String!]!

    tenants: [String!]!
    status: String!
    name: String!
    formalName: Locale
    emails: [String!]!

    oAuth2s: [String!]!
    avatarUrl: String
    mobile: String
    whatsapp: String

    networkStatus: String

    timezone: String!
    locale: String!

    darkMode: Boolean!
    theme: String

    apiKeys: [ApiKey]
    roles: [String!]!
    features: [String!]!
    scopes: [String!]!

    yob: Int
    dob: String

    coin: Int!
    virtualCoin: Int!
    balanceAuditedAt: Float!

    paymentMethods: [PaymentMethod!]!
    preference: String
    subscriptions: [Subscription!]!

    interests: [String!]!
    supervisors: [String!]!
    staffs: [String!]!

    violations: [Violation!]!
    suspension: String
    expoPushTokens: [String!]!

    creditability: Int!
    identifiedAt: Float

    studentIds: [String!]!
    histories: [YearLevelClass]!

    favoriteTutors: [String!]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
