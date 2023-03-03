/**
 * Apollo Query: ChatGroup
 *
 */

import { gql } from 'apollo-server-core';

import { STATUS_RESPONSE } from './common';

const CHAT_GROUP_FIELDS = gql`
  fragment ChatGroupFields on ChatGroup {
    _id
    flags
    tenant
    title
    description
    membership
    users
    admins
    chats
    adminKey
    key
    url
    logoUrl
    createdAt
    updatedAt
  }
`;

export const ADD_CHAT_GROUP = gql`
  ${CHAT_GROUP_FIELDS}
  mutation AddChatGroup(
    $tenantId: String!
    $userIds: [String!]!
    $title: String
    $description: String
    $membership: String!
    $logoUrl: String
  ) {
    addChatGroup(
      tenantId: $tenantId
      userIds: $userIds
      title: $title
      description: $description
      membership: $membership
      logoUrl: $logoUrl
    ) {
      ...ChatGroupFields
    }
  }
`;

export const ADD_CHAT_GROUP_ADMINS = gql`
  ${CHAT_GROUP_FIELDS}
  mutation AddChatGroupAdmins($id: ID!, $userIds: [String!]!) {
    addChatGroupAdmins(id: $id, userIds: $userIds) {
      ...ChatGroupFields
    }
  }
`;

export const ADD_CHAT_GROUP_USERS = gql`
  ${CHAT_GROUP_FIELDS}
  mutation AddChatGroupUsers($id: ID!, $userIds: [String!]!) {
    addChatGroupUsers(id: $id, userIds: $userIds) {
      ...ChatGroupFields
    }
  }
`;

export const GET_CHAT_GROUP = gql`
  ${CHAT_GROUP_FIELDS}
  query GetChatGroup($id: ID!) {
    chatGroup(id: $id) {
      ...ChatGroupFields
    }
  }
`;

export const GET_CHAT_GROUPS = gql`
  ${CHAT_GROUP_FIELDS}
  query GetChatGroups($query: QueryInput) {
    chatGroups(query: $query) {
      ...ChatGroupFields
    }
  }
`;

export const JOIN_CHAT_GROUP = gql`
  ${CHAT_GROUP_FIELDS}
  mutation JoinChatGroup($id: ID!) {
    joinChatGroup(id: $id) {
      ...ChatGroupFields
    }
  }
`;

export const LEAVE_CHAT_GROUP = gql`
  ${STATUS_RESPONSE}
  mutation LeaveChatGroup($id: ID!) {
    leaveChatGroup(id: $id) {
      ...StatusResponse
    }
  }
`;

export const REMOVE_CHAT_GROUP_USERS = gql`
  ${CHAT_GROUP_FIELDS}
  mutation RemoveChatGroupUsers($id: ID!, $userIds: [String!]!) {
    removeChatGroupUsers(id: $id, userIds: $userIds) {
      ...ChatGroupFields
    }
  }
`;

export const TO_ADMIN_CHAT_GROUP = gql`
  ${CHAT_GROUP_FIELDS}
  mutation ToAdminChatGroup($content: String!) {
    toAdminChatGroup(content: $content) {
      ...ChatGroupFields
    }
  }
`;

export const TO_ALEX_CHAT_GROUP = gql`
  ${CHAT_GROUP_FIELDS}
  mutation ToAlexChatGroup($content: String!) {
    toAlexChatGroup(content: $content) {
      ...ChatGroupFields
    }
  }
`;

export const TO_TENANT_ADMINS_CHAT_GROUP = gql`
  ${CHAT_GROUP_FIELDS}
  mutation ToTenantAdminsChatGroup($tenantId: String!, $content: String!) {
    toTenantAdminsChatGroup(tenantId: $tenantId, content: $content) {
      ...ChatGroupFields
    }
  }
`;

export const UPDATE_CHAT_GROUP = gql`
  ${CHAT_GROUP_FIELDS}
  mutation UpdateChatGroup($id: ID!, $title: String, $description: String, $membership: String!, $logoUrl: String) {
    updateChatGroup(id: $id, title: $title, description: $description, membership: $membership, logoUrl: $logoUrl) {
      ...ChatGroupFields
    }
  }
`;
