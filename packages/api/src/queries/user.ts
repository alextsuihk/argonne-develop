/**
 * Apollo Query: User
 *
 */

import gql from 'graphql-tag';

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

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
    features

    avatarUrl

    violations {
      createdAt
      reason
      links
    }
    suspendUtil
    identifiedAt

    studentIds
    schoolHistories {
      year
      school
      level
      schoolClass
      updatedAt
    }

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const GET_USER = gql`
  ${USER_FIELDS}
  query GetUser($id: ID!) {
    user(id: $id) {
      ...UserFields
    }
  }
`;

export const GET_USERS = gql`
  ${USER_FIELDS}
  query GetUsers($query: QueryInput) {
    users(query: $query) {
      ...UserFields
    }
  }
`;

export const ADD_USER = gql`
  ${USER_FIELDS}
  mutation AddUser($tenantId: String, $email: String!, $name: String!, $studentId: String) {
    addUser(tenantId: $tenantId, email: $email, name: $name, studentId: $studentId) {
      ...UserFields
    }
  }
`;

export const ADD_USER_FEATURE = gql`
  ${USER_FIELDS}
  mutation AddUserFeature($id: ID!, $feature: String!) {
    addUserFeature(id: $id, feature: $feature) {
      ...UserFields
    }
  }
`;

export const ADD_USER_REMARK = gql`
  ${USER_FIELDS}
  mutation AddUserRemark($id: ID!, $remark: String!) {
    addUserRemark(id: $id, remark: $remark) {
      ...UserFields
    }
  }
`;

export const ADD_USER_SCHOOL_HISTORY = gql`
  ${USER_FIELDS}
  mutation AddUserSchoolHistory($id: ID!, $year: String!, $level: String!, $schoolClass: String) {
    addUserSchoolHistory(id: $id, year: $year, level: $level, schoolClass: $schoolClass) {
      ...UserFields
    }
  }
`;

export const CHANGE_USER_PASSWORD = gql`
  ${STATUS_RESPONSE}
  mutation ChangeUserPassword($id: ID!, $password: String!) {
    changeUserPassword(id: $id, password: $password) {
      ...StatusResponse
    }
  }
`;

export const CLEAR_USER_FLAG = gql`
  ${USER_FIELDS}
  mutation ClearUserFlag($id: ID!, $flag: String!) {
    clearUserFlag(id: $id, flag: $flag) {
      ...UserFields
    }
  }
`;

export const REMOVE_USER_FEATURE = gql`
  ${USER_FIELDS}
  mutation RemoveUserFeature($id: ID!, $feature: String!) {
    removeUserFeature(id: $id, feature: $feature) {
      ...UserFields
    }
  }
`;

export const SET_USER_FLAG = gql`
  ${USER_FIELDS}
  mutation SetUserFlag($id: ID!, $flag: String!) {
    setUserFlag(id: $id, flag: $flag) {
      ...UserFields
    }
  }
`;

export const SUSPEND_USER = gql`
  ${USER_FIELDS}
  mutation SuspendUser($id: ID!) {
    suspendUser(id: $id) {
      ...UserFields
    }
  }
`;
export const UPDATE_USER_IDENTIFIED_AT = gql`
  ${USER_FIELDS}
  mutation UpdateUserIdentifiedAt($id: ID!) {
    updateUserIdentifiedAt(id: $id) {
      ...UserFields
    }
  }
`;
