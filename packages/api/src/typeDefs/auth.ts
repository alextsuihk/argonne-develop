/**
 * Apollo TypeDef: Auth (login, register & OAuth2)
 */

// TODO: PlaceHolder... https://dev.to/alvarojsnish/graphql-mongodb-the-easy-way-ngc

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    listSockets: [String!]!
    listTokens: [Token!]!
  }

  extend type Mutation {
    addApiKey(scope: String!, note: String, expireAt: DateInput): AuthUser!
    # addPaymentMethod(): AuthUser! ### TODO
    deregister(password: String!, coordinates: CoordinatesInput, clientHash: String): DeregisterResponse!
    impersonateStart(userId: String!, coordinates: CoordinatesInput, clientHash: String): AuthSuccessfulResponse!
    impersonateStop(refreshToken: String!, coordinates: CoordinatesInput): StatusResponse!
    login(
      email: String!
      password: String!
      isPublic: Boolean
      force: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthResponse!
    loginToken(tenantId: String!, userId: String!, expiresIn: Int): String!
    loginWithStudentId(
      studentId: String!
      password: String!
      isPublic: Boolean
      force: Boolean
      coordinates: CoordinatesInput
      clientHash: String
      tenantId: String!
    ): AuthResponse!
    loginWithToken(token: String!): AuthResponse!
    logout(refreshToken: String!, coordinates: CoordinatesInput): StatusResponse!
    logoutOther(refreshToken: String!, coordinates: CoordinatesInput): LogoutOtherResponse!
    oAuth2(
      provider: String!
      token: String!
      isPublic: Boolean
      force: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthResponse!
    oAuth2Link(provider: String!, token: String!, coordinates: CoordinatesInput): AuthUser!
    oAuth2Unlink(provider: String!, coordinates: CoordinatesInput): AuthUser!
    register(
      name: String!
      email: String!
      password: String!
      isPublic: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthSuccessfulResponse!
    removeApiKey(id: String!): AuthUser!
    removePaymentMethod(id: String!): AuthUser!
    renewToken(
      refreshToken: String!
      isPublic: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthSuccessfulResponse!
    updateLocale(locale: String!): AuthUser!
    updateNetworkStatus(networkStatus: String!): AuthUser!
    updateUserProfile(
      name: String!
      formalName: LocaleInput
      avatarUrl: String
      mobile: String
      whatsapp: String
      yob: Int
      dob: DateInput
    ): AuthUser!
  }

  type AuthConflict {
    ip: String
    maxLogin: Int
    exceedLogin: Int
  }

  type AuthResponse {
    accessToken: String
    accessTokenExpireAt: Float
    refreshToken: String
    refreshTokenExpireAt: Float
    conflict: AuthConflict
    user: AuthUser!
  }

  type AuthSuccessfulResponse {
    accessToken: String!
    accessTokenExpireAt: Float!
    refreshToken: String!
    refreshTokenExpireAt: Float!
    user: AuthUser!
  }

  type AuthUser {
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

    apiKeys: [UserApiKey]
    roles: [String!]!
    features: [String!]!
    scopes: [String!]!

    yob: Int
    dob: String

    coin: Int!
    virtualCoin: Int!
    balanceAuditedAt: Float!

    paymentMethods: [UserPaymentMethod!]!
    preference: String
    subscriptions: [UserSubscription!]!

    interests: [String!]!
    supervisors: [String!]!
    staffs: [String!]!

    violations: [UserViolation!]!
    suspension: String
    expoPushTokens: [String!]!

    creditability: Int!
    identifiedAt: Float

    studentIds: [String!]!
    schoolHistories: [UserSchoolHistory]!

    favoriteTutors: [String!]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }

  type DeregisterResponse {
    code: String
    days: Int
  }

  type LogoutOtherResponse {
    code: String
    count: Int
  }

  type Token {
    _id: ID!
    authUser: String
    ip: String!
    ua: String!
    updatedAt: Float!
  }

  type UserApiKey {
    scope: String!
    note: String
    expireAt: Float!
  }

  type UserPaymentMethod {
    currency: String!
    type: String!
    bank: String
    account: String!
    payable: Boolean!
    receivable: Boolean!
  }

  type UserSchoolHistory {
    year: String!
    school: String!
    level: String!
    schoolClass: String
    updatedAt: Float!
  }

  type UserSubscription {
    token: String!
    subscription: String!
    enabled: Boolean!
    permission: String!
    ip: String!
    ua: String!
  }

  type UserViolation {
    # TODO
    createdAt: Float!
    reason: String!
    links: [String!]!
  }
`;
