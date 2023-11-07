/**
 * Apollo Query: Auth
 *
 */

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const API_KEY_FIELDS = `#graphql
  fragment ApiKeyFields on ApiKey {
    _id
    token
    scope
    note
    expireAt
  }
`;

const AUTH_USER_FIELDS = `#graphql
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
    messengers

    availability
    timezone
    locale

    darkMode
    theme

    roles
    features

    yob
    dob

    coin
    virtualCoin
    balanceAuditedAt

    paymentMethods {
      _id
      currency
      bank
      account
      payable
      receivable
    }
    preference
    pushSubscriptions {
      endpoint
      p256dh
      auth
    }

    supervisors
    staffs

    violations {
      createdAt
      reason
      links
    }
    suspendUtil
    expoPushTokens

    creditability
    identifiedAt

    stashes {
      _id
      title
      secret
      url
    }

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

const AUTH_SUCCESSFUL_RESPONSE_FIELDS = `#graphql
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

const AUTH_RESPONSE_FIELDS = `#graphql
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

// query

export const IS_EMAIL_AVAILABLE = `#graphql
  query IsEmailAvailable($email: String!) {
    isEmailAvailable(email: $email)
  }
`;

export const LIST_API_KEYS = `#graphql
  ${API_KEY_FIELDS}
  query ListApiKeys {
    listApiKeys {
      ...ApiKeyFields
    }
  }
`;

export const LIST_SOCKETS = `#graphql
  query ListSockets {
    listSockets
  }
`;

export const LIST_TOKENS = `#graphql
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

export const LOGIN_TOKEN = `#graphql
  query LoginToken($tenantId: String!, $userId: String!, $expiresIn: Int) {
    loginToken(tenantId: $tenantId, userId: $userId, expiresIn: $expiresIn)
  }
`;

// login, logout, register, etc
export const DEREGISTER = `#graphql
  mutation Deregister($password: String!, $coordinates: CoordinatesInput, $clientHash: String) {
    deregister(password: $password, coordinates: $coordinates, clientHash: $clientHash) {
      code
      days
    }
  }
`;

export const LOGIN = `#graphql
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

export const LOGIN_WITH_STUDENT_ID = `#graphql
  ${AUTH_RESPONSE_FIELDS}
  mutation LoginWithStudentId(
    $tenantId: String!
    $studentId: String!
    $password: String!
    $isPublic: Boolean
    $force: Boolean
    $coordinates: CoordinatesInput
    $clientHash: String
  ) {
    loginWithStudentId(
      tenantId: $tenantId
      studentId: $studentId
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

export const LOGIN_WITH_TOKEN = `#graphql
  ${AUTH_RESPONSE_FIELDS}
  mutation LoginWithToken($token: String!) {
    loginWithToken(token: $token) {
      ...AuthResponseFields
    }
  }
`;

export const LOGOUT = `#graphql
  ${STATUS_RESPONSE}
  mutation Logout($refreshToken: String!, $coordinates: CoordinatesInput) {
    logout(refreshToken: $refreshToken, coordinates: $coordinates) {
      ...StatusResponse
    }
  }
`;

export const LOGOUT_OTHER = `#graphql
  mutation LogoutOther($refreshToken: String!, $coordinates: CoordinatesInput) {
    logoutOther(refreshToken: $refreshToken, coordinates: $coordinates) {
      code
      count
    }
  }
`;

export const OAUTH2 = `#graphql
  ${AUTH_RESPONSE_FIELDS}
  mutation OAuth2(
    $provider: String!
    $code: String!
    $isPublic: Boolean
    $force: Boolean
    $coordinates: CoordinatesInput
    $clientHash: String
  ) {
    oAuth2(
      provider: $provider
      code: $code
      isPublic: $isPublic
      force: $force
      coordinates: $coordinates
      clientHash: $clientHash
    ) {
      ...AuthResponseFields
    }
  }
`;

export const REGISTER = `#graphql
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

export const RENEW_TOKEN = `#graphql
  ${AUTH_SUCCESSFUL_RESPONSE_FIELDS}
  mutation RenewToken($refreshToken: String!, $isPublic: Boolean, $coordinates: CoordinatesInput, $clientHash: String) {
    renewToken(refreshToken: $refreshToken, isPublic: $isPublic, coordinates: $coordinates, clientHash: $clientHash) {
      ...AuthSuccessfulResponseFields
    }
  }
`;

// impersonation
export const IMPERSONATE_START = `#graphql
  ${AUTH_SUCCESSFUL_RESPONSE_FIELDS}
  mutation ImpersonateStart($userId: String!, $coordinates: CoordinatesInput, $clientHash: String) {
    impersonateStart(userId: $userId, coordinates: $coordinates, clientHash: $clientHash) {
      ...AuthSuccessfulResponseFields
    }
  }
`;

export const IMPERSONATE_STOP = `#graphql
  mutation ImpersonateStop($refreshToken: String!, $coordinates: CoordinatesInput) {
    ${STATUS_RESPONSE}
    impersonateStop(refreshToken: $refreshToken, coordinates: $coordinates) {
      ...StatusResponse
    }
  }
`;

// send verification
export const SEND_EMAIL_VERIFICATION = `#graphql
  ${STATUS_RESPONSE}
  mutation SendEmailVerification($email: String!) {
    sendEmailVerification(email: $email) {
      ...StatusResponse
    }
  }
`;

export const SEND_MESSENGER_VERIFICATION = `#graphql
  ${STATUS_RESPONSE}
  mutation SendMessengerVerification($provider: String!, $account: String!) {
    sendMessengerVerification(provider: $provider, account: $account) {
      ...StatusResponse
    }
  }
`;

// update
export const ADD_API_KEY = `#graphql
  ${API_KEY_FIELDS}
  mutation AddApiKey($scope: String!, $note: String, $expireAt: DateInput!) {
    addApiKey(scope: $scope, note: $note, expireAt: $expireAt) {
      ...ApiKeyFields
    }
  }
`;

export const ADD_EMAIL = `#graphql
  ${AUTH_USER_FIELDS}
  mutation AddEmail($email: String!) {
    addEmail(email: $email) {
      ...AuthUserFields
    }
  }
`;

export const ADD_MESSENGER = `#graphql
  ${AUTH_USER_FIELDS}
  mutation AddMessenger($provider: String!, $account: String!) {
    addMessenger(provider: $provider, account: $account) {
      ...AuthUserFields
    }
  }
`;

export const ADD_PAYMENT_METHOD = `#graphql
  ${AUTH_USER_FIELDS}
  mutation AddPaymentMethod(
    $currency: String!
    $bank: String
    $account: String!
    $payable: Boolean
    $receivable: Boolean
  ) {
    addPaymentMethod(currency: $currency, bank: $bank, account: $account, payable: $payable, receivable: $receivable) {
      ...AuthUserFields
    }
  }
`;

export const ADD_PUSH_SUBSCRIPTION = `#graphql
  ${AUTH_USER_FIELDS}
  mutation AddPushSubscription($endpoint: String!, $p256dh: String!, $auth: String!) {
    addPushSubscription(endpoint: $endpoint, p256dh: $p256dh, auth: $auth) {
      ...AuthUserFields
    }
  }
`;

export const ADD_STASH = `#graphql
  ${AUTH_USER_FIELDS}
  mutation AddStash($title: String!, $secret: String!, $url: String!) {
    addStash(title: $title, secret: $secret, url: $url) {
      ...AuthUserFields
    }
  }
`;

export const OAUTH2_LINK = `#graphql
  ${AUTH_USER_FIELDS}
  mutation OAuth2Link($provider: String!, $code: String!) {
    oAuth2Link(provider: $provider, code: $code) {
      ...AuthUserFields
    }
  }
`;

export const OAUTH2_UNLINK = `#graphql
  ${AUTH_USER_FIELDS}
  mutation OAuth2Unlink($oAuthId: String!) {
    oAuth2Unlink(oAuthId: $oAuthId) {
      ...AuthUserFields
    }
  }
`;

export const REMOVE_API_KEY = `#graphql
  ${API_KEY_FIELDS}
  mutation RemoveApiKey($id: String!) {
    removeApiKey(id: $id) {
      ...ApiKeyFields
    }
  }
`;

export const REMOVE_EMAIL = `#graphql
  ${AUTH_USER_FIELDS}
  mutation RemoveEmail($email: String!) {
    removeEmail(email: $email) {
      ...AuthUserFields
    }
  }
`;

export const REMOVE_MESSENGER = `#graphql
  ${AUTH_USER_FIELDS}
  mutation RemoveMessenger($provider: String!, $account: String!) {
    removeMessenger(provider: $provider, account: $account) {
      ...AuthUserFields
    }
  }
`;

export const REMOVE_PAYMENT_METHOD = `#graphql
  ${AUTH_USER_FIELDS}
  mutation RemovePaymentMethod($id: String!) {
    removePaymentMethod(id: $id) {
      ...AuthUserFields
    }
  }
`;

export const REMOVE_PUSH_SUBSCRIPTIONS = `#graphql
  ${AUTH_USER_FIELDS}
  mutation RemovePushSubscriptions {
    removePushSubscriptions {
      ...AuthUserFields
    }
  }
`;

export const REMOVE_STASH = `#graphql
  ${AUTH_USER_FIELDS}
  mutation RemoveStash($id: String!) {
    removeStash(id: $id) {
      ...AuthUserFields
    }
  }
`;

export const UPDATE_AVAILABILITY = `#graphql
  ${AUTH_USER_FIELDS}
  mutation UpdateAvailability($availability: String) {
    updateAvailability(availability: $availability) {
      ...AuthUserFields
    }
  }
`;

export const UPDATE_AVATAR = `#graphql
  ${AUTH_USER_FIELDS}
  mutation UpdateAvatar($avatarUrl: String) {
    updateAvatar(avatarUrl: $avatarUrl) {
      ...AuthUserFields
    }
  }
`;

export const UPDATE_LOCALE = `#graphql
  ${AUTH_USER_FIELDS}
  mutation UpdateLocale($locale: String!) {
    updateLocale(locale: $locale) {
      ...AuthUserFields
    }
  }
`;

export const UPDATE_PROFILE = `#graphql
  ${AUTH_USER_FIELDS}
  mutation UpdateProfile($name: String, $formalName: LocaleInput, $yob: Int, $dob: DateInput) {
    updateProfile(name: $name, formalName: $formalName, yob: $yob, dob: $dob) {
      ...AuthUserFields
    }
  }
`;

export const VERIFY_EMAIL = `#graphql
  ${STATUS_RESPONSE}
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      ...StatusResponse
    }
  }
`;

export const VERIFY_MESSENGER = `#graphql
  ${AUTH_USER_FIELDS}
  mutation VerifyMessenger($provider: String!, $account: String!, $token: String!) {
    verifyMessenger(provider: $provider, account: $account, token: $token) {
      ...AuthUserFields
    }
  }
`;
