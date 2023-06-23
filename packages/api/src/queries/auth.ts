/**
 * Apollo Query: Auth
 *
 */

// TODO: add impersonateStart/Stop
// TODO: add coordinates

import { gql } from 'apollo-server-core';

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

export const AUTH_USER_FIELDS = gql`
  ${LOCALE}
  ${REMARK}
  fragment AuthUserFields on AuthUser {
    _id
    flags

    tenants
    status
    name
    formalName {
      ...LocaleFields
    }
    emails

    oAuth2s
    avatarUrl
    mobile
    whatsapp

    networkStatus
    timezone
    locale

    darkMode
    theme

    apiKeys {
      scope
      note
      expireAt
    }
    roles
    features
    scopes

    yob
    dob

    coin
    virtualCoin
    balanceAuditedAt

    paymentMethods {
      currency
      type
      bank
      account
      payable
      receivable
    }
    preference
    subscriptions {
      token
      subscription
      enabled
      permission
      ip
      ua
    }

    interests
    supervisors
    staffs

    violations {
      createdAt
      reason
      links
    }
    suspension
    expoPushTokens

    creditability
    identifiedAt

    studentIds
    schoolHistories {
      year
      school
      level
      schoolClass
      updatedAt
    }

    favoriteTutors

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

const AUTH_SUCCESSFUL_RESPONSE_FIELDS = gql`
  ${AUTH_USER_FIELDS}
  fragment AuthSuccessfulResponseFields on AuthSuccessfulResponse {
    accessToken
    accessTokenExpireAt
    refreshToken
    refreshTokenExpireAt
    user {
      ...AuthUserFields
    }
  }
`;

const AUTH_RESPONSE_FIELDS = gql`
  ${AUTH_USER_FIELDS}
  fragment AuthResponseFields on AuthResponse {
    accessToken
    accessTokenExpireAt
    refreshToken
    refreshTokenExpireAt
    conflict {
      ip
      maxLogin
      exceedLogin
    }
    user {
      ...AuthUserFields
    }
  }
`;

export const DEREGISTER = gql`
  mutation Deregister($password: String!, $coordinates: CoordinatesInput, $clientHash: String) {
    deregister(password: $password, coordinates: $coordinates, clientHash: $clientHash) {
      code
      days
    }
  }
`;

export const IMPERSONATE_START = gql`
  ${AUTH_SUCCESSFUL_RESPONSE_FIELDS}
  mutation ImpersonateStart($userId: String!, $coordinates: CoordinatesInput, $clientHash: String) {
    impersonateStart(userId: $userId, coordinates: $coordinates, clientHash: $clientHash) {
      ...AuthSuccessfulResponseFields
    }
  }
`;

export const IMPERSONATE_STOP = gql`
  mutation ImpersonateStop($refreshToken: String!, $coordinates: CoordinatesInput) {
    ${STATUS_RESPONSE}
    impersonateStop(refreshToken: $refreshToken, coordinates: $coordinates) {
      ...StatusResponse
    }
  }
`;

export const LIST_SOCKETS = gql`
  query ListSockets {
    listSockets
  }
`;

export const LIST_TOKENS = gql`
  query ListTokens {
    listTokens {
      _id
      authUser
      ip
      ua
      updatedAt
    }
  }
`;

export const LOGIN = gql`
  ${AUTH_RESPONSE_FIELDS}
  mutation Login(
    $email: String!
    $password: String!
    $isPublic: Boolean
    $force: Boolean
    $coordinates: CoordinatesInput
    $clientHash: String
  ) {
    login(
      email: $email
      password: $password
      isPublic: $isPublic
      force: $force
      coordinates: $coordinates
      clientHash: $clientHash
    ) {
      ...AuthResponseFields
    }
  }
`;

export const LOGIN_TOKEN = gql`
  mutation LoginToken($tenantId: String!, $userId: String!, $expiresIn: Int) {
    loginToken(tenantId: $tenantId, userId: $userId, expiresIn: $expiresIn)
  }
`;

export const LOGIN_WITH_STUDENT_ID = gql`
  ${AUTH_RESPONSE_FIELDS}
  mutation LoginWithStudentId(
    $studentId: String!
    $password: String!
    $isPublic: Boolean
    $force: Boolean
    $coordinates: CoordinatesInput
    $clientHash: String
    $tenantId: String!
  ) {
    loginWithStudentId(
      studentId: $studentId
      password: $password
      isPublic: $isPublic
      force: $force
      coordinates: $coordinates
      clientHash: $clientHash
      tenantId: $tenantId
    ) {
      ...AuthResponseFields
    }
  }
`;

export const LOGIN_WITH_TOKEN = gql`
  ${AUTH_RESPONSE_FIELDS}
  mutation LoginWithToken($token: String!) {
    loginWithToken(token: $token) {
      ...AuthResponseFields
    }
  }
`;

export const LOGOUT = gql`
  ${STATUS_RESPONSE}
  mutation Logout($refreshToken: String!, $coordinates: CoordinatesInput) {
    logout(refreshToken: $refreshToken, coordinates: $coordinates) {
      ...StatusResponse
    }
  }
`;

export const LOGOUT_OTHER = gql`
  mutation LogoutOther($refreshToken: String!, $coordinates: CoordinatesInput) {
    logoutOther(refreshToken: $refreshToken, coordinates: $coordinates) {
      code
      count
    }
  }
`;

// TODO:
// export const OAUTH2 = gql`
//   ${AUTH_RESPONSE_FIELDS}
//   mutation OAuth2(
//     $provider: String!
//     $token: String!
//     $isPublic: Boolean
//     $force: Boolean
//     $coordinates: CoordinatesInput
//     $clientHash: String
//   ) {
//     oAuth2(
//       provider: $provider
//       token: $token
//       isPublic: $isPublic
//       force: $force
//       coordinates: $coordinates
//       clientHash: $clientHash
//     ) {
//       ...AuthResponseFields
//     }
//   }
// `;

// export const OAUTH2_CONNECT = gql`
//   ${STATUS_RESPONSE}
//   mutation OAuth2Connect($provider: String!, $token: String!) {
//     oAuth2Link(provider: $provider, token: $token) {
//       ...StatusResponse
//     }
//   }
// `;

// export const OAUTH2_DISCONNECT = gql`
//   ${STATUS_RESPONSE}
//   mutation OAuth2Disconnect($provider: String!, $token: String!) {
//     oAuth2Unlink(provider: $provider, token: $token) {
//       ...StatusResponse
//     }
//   }
// `;

export const REGISTER = gql`
  ${AUTH_SUCCESSFUL_RESPONSE_FIELDS}
  mutation Register(
    $name: String!
    $email: String!
    $password: String!
    $isPublic: Boolean
    $coordinates: CoordinatesInput
    $clientHash: String
  ) {
    register(
      name: $name
      email: $email
      password: $password
      isPublic: $isPublic
      coordinates: $coordinates
      clientHash: $clientHash
    ) {
      ...AuthSuccessfulResponseFields
    }
  }
`;

export const RENEW_TOKEN = gql`
  ${AUTH_SUCCESSFUL_RESPONSE_FIELDS}
  mutation RenewToken($refreshToken: String!, $isPublic: Boolean, $coordinates: CoordinatesInput, $clientHash: String) {
    renewToken(refreshToken: $refreshToken, isPublic: $isPublic, coordinates: $coordinates, clientHash: $clientHash) {
      ...AuthSuccessfulResponseFields
    }
  }
`;
