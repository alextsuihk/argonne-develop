/**
 * Apollo TypeDef: Auth (login, register & OAuth2)
 */

// TODO: PlaceHolder... https://dev.to/alvarojsnish/graphql-mongodb-the-easy-way-ngc

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    authServiceToken(client: String!): AuthService
    isEmailAvailable(email: String!): Boolean
    listApiKeys: [ApiKey!]!
    listSockets: [String!]!
    listTokens: [Token!]!
    loginToken(tenantId: String!, userId: String!, expiresIn: Int): String!
  }

  extend type Mutation {
    # login, logout, register, etc
    deregister(password: String!, coordinates: CoordinatesInput, clientHash: String): DeregisterResponse!
    login(
      email: String!
      password: String!
      isPublic: Boolean
      force: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthResponse!
    loginWithStudentId(
      tenantId: String!
      studentId: String!
      password: String!
      isPublic: Boolean
      force: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthResponse!
    loginWithToken(token: String!, coordinates: CoordinatesInput, clientHash: String): AuthResponse!
    logout(refreshToken: String!, coordinates: CoordinatesInput): StatusResponse!
    logoutOther(refreshToken: String!, coordinates: CoordinatesInput): LogoutOtherResponse!
    oAuth2(
      provider: String!
      code: String!
      isPublic: Boolean
      force: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthResponse!
    register(
      name: String!
      email: String!
      password: String!
      isPublic: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthSuccessfulResponse!
    renewToken(
      refreshToken: String!
      isPublic: Boolean
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthSuccessfulResponse!

    # impersonation
    impersonateStart(userId: String!, coordinates: CoordinatesInput, clientHash: String): AuthSuccessfulResponse!
    impersonateStop(refreshToken: String!, coordinates: CoordinatesInput): StatusResponse!

    # request to send verification
    sendEmailVerification(email: String!): StatusResponse!
    sendMessengerVerification(provider: String!, account: String!): StatusResponse!

    # update (auth-extra)
    addApiKey(scope: String!, note: String, expireAt: DateInput!): [ApiKey!]!
    addEmail(email: String!): AuthUser!
    addMessenger(provider: String!, account: String!): AuthUser!
    addPaymentMethod(
      currency: String!
      bank: String
      account: String!
      payable: Boolean
      receivable: Boolean
    ): AuthUser!
    addPushSubscription(endpoint: String!, p256dh: String!, auth: String!): AuthUser!
    addStash(title: String!, secret: String!, url: String!): AuthUser!
    oAuth2Link(provider: String!, code: String!): AuthUser!
    oAuth2Unlink(oAuthId: String!): AuthUser!
    removeApiKey(id: String!): [ApiKey!]!
    removeEmail(email: String!): AuthUser!
    removeMessenger(provider: String!, account: String!): AuthUser!
    removePaymentMethod(id: String!): AuthUser!
    removePushSubscriptions: AuthUser!
    removeStash(id: String!): AuthUser!
    updateAvailability(availability: String): AuthUser!
    updateAvatar(avatarUrl: String): AuthUser!
    updateLocale(locale: String!): AuthUser!
    updateProfile(name: String, formalName: LocaleInput, yob: Int, dob: DateInput): AuthUser!
    verifyEmail(token: String!): StatusResponse!
    verifyMessenger(provider: String!, account: String!, token: String!): AuthUser!
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

  type AuthService {
    clientId: String!
    token: String!
    tokenExpireAt: Float!
    redirectUri: String!
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
    messengers: [String!]!

    availability: String

    timezone: String!
    locale: String!

    darkMode: Boolean!
    theme: String

    roles: [String!]!
    features: [String!]!

    yob: Int
    dob: Float

    coin: Int!
    virtualCoin: Int!
    balanceAuditedAt: Float!

    paymentMethods: [UserPaymentMethod!]!
    preference: String
    pushSubscriptions: [UserPushSubscription!]!

    supervisors: [String!]!
    staffs: [String!]!

    violations: [UserViolation!]!
    suspendUtil: Float
    expoPushTokens: [String!]!

    creditability: Int!
    identifiedAt: Float

    stashes: [Stash!]!

    studentIds: [String!]!
    schoolHistories: [UserSchoolHistory]!

    favoriteTutors: [String!]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }

  type ApiKey {
    _id: String!
    token: String!
    scope: String!
    note: String
    expireAt: Float!
  }

  type DeregisterResponse {
    code: String
    days: Int
  }

  type LogoutOtherResponse {
    code: String
    count: Int
  }

  type Stash {
    _id: ID!
    title: String!
    secret: String!
    url: String!
  }

  type Token {
    _id: ID!
    authUser: String
    ip: String!
    ua: String!
    updatedAt: Float!
  }

  type UserPaymentMethod {
    _id: String!
    currency: String!
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

  type UserPushSubscription {
    endpoint: String!
    p256dh: String!
    auth: String!
  }

  type UserViolation {
    # TODO
    createdAt: Float!
    reason: String!
    links: [String!]!
  }
`;
