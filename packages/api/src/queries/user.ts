/**
 * Apollo Query: User
 *
 */

import { gql } from 'apollo-server-core';

import { LOCALE, REMARK } from './common';

export const USER_FIELDS = gql`
  ${LOCALE}
  ${REMARK}
  fragment UserFields on User {
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
      value
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
    histories {
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

export const ADD_USER = gql`
  ${USER_FIELDS}
  mutation AddUser($tenantId: String!, $email: String!) {
    addUser(tenantId: $tenantId, email: $email) {
      ...UserFields
    }
  }
`;

// TODO
// export const GET_USER = gql`
//   ${USER_FIELDS}
//   query GetUser($id: ID!) {
//     user(id: $id) {
//       ...UserFields
//     }
//   }
// `;

// export const GET_USERS = gql`
//   ${USER_FIELDS}
//   query GetUsers($query: QueryInput) {
//     users(query: $query) {
//       ...UserFields
//     }
//   }
// `;

// export const CREATE_USER = gql`
//   ${USER_FIELDS}
//   mutation CreateUser($name: LocaleInput!, $tel: String!, $website: String!, $remark: String) {
//     createUser(name: $name, tel: $tel, website: $website, remark: $remark) {
//       ...UserFields
//     }
//   }
// `;

// export const REMOVE_USER = gql`
//   ${USER_FIELDS}
//   mutation RemoveUser($id: ID!, $remark: String) {
//     removeUser(id: $id, remark: $remark) {
//       ...UserFields
//     }
//   }
// `;

// export const UPDATE_USER = gql`
//   ${USER_FIELDS}
//   mutation UpdateUser($id: ID!, $name: LocaleInput!, $tel: String!, $website: String!, $remark: String) {
//     updateUser(id: $id, name: $name, tel: $tel, website: $website, remark: $remark) {
//       ...UserFields
//     }
//   }
// `;

// export const ADD_USER_ADMIN = gql`
//   ${USER_FIELDS}
//   mutation AddUserAdmin($id: ID!, $adminId: String!) {
//     addUserAdmin(id: $id, adminId: $adminId) {
//       ...UserFields
//     }
//   }
// `;

// export const REMOVE_USER_ADMIN = gql`
//   ${USER_FIELDS}
//   mutation removeUserAdmin($id: ID!, $adminId: String!) {
//     removeUserAdmin(id: $id, adminId: $adminId) {
//       ...UserFields
//     }
//   }
// `;
