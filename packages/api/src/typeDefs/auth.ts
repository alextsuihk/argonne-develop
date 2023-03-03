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
    deregister(password: String!, coordinates: CoordinatesInput, clientHash: String): DeregisterResponse!
    impersonateStart(
      impersonatedAsId: String!
      coordinates: CoordinatesInput
      clientHash: String
    ): AuthSuccessfulResponse!
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
    oAuth2Connect(provider: String!, token: String!, coordinates: CoordinatesInput): User!
    oAuth2Disconnect(provider: String!, coordinates: CoordinatesInput): User!
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
    user: User!
  }

  type AuthSuccessfulResponse {
    accessToken: String!
    accessTokenExpireAt: Float!
    refreshToken: String!
    refreshTokenExpireAt: Float!
    user: User!
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
`;
