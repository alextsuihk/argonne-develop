/**
 * Apollo Query: ChatGroup
 *
 */

import { CHAT, STATUS_RESPONSE } from './common';

const CHAT_GROUP_FIELDS = `#graphql
  ${CHAT}
  fragment ChatGroupFields on ChatGroup {
    _id
    flags
    tenant
    title
    description
    membership
    users
    admins
    marshals
    chats {
      ...ChatFields
    }
    key
    url
    logoUrl
    createdAt
    updatedAt

    contentsToken
  }
`;

export const ADD_CHAT_GROUP = `#graphql
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

export const ADD_CHAT_GROUP_CONTENT = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation AddChatGroupContent($id: ID!, $chatId: String!, $content: String!, $visibleAfter: DateInput) {
    addChatGroupContent(id: $id, chatId: $chatId, content: $content, visibleAfter: $visibleAfter) {
      ...ChatGroupFields
    }
  }
`;

export const ADD_CHAT_GROUP_CONTENT_WITH_NEW_CHAT = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation AddChatGroupContentWithNewChat($id: ID!, $content: String!, $visibleAfter: DateInput) {
    addChatGroupContentWithNewChat(id: $id, content: $content, visibleAfter: $visibleAfter) {
      ...ChatGroupFields
    }
  }
`;

export const ATTACH_CHAT_GROUP_TO_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation AttachChatGroupChatToChatGroup($id: ID!, $chatId: String!, $sourceId: String!) {
    attachChatGroupChatToChatGroup(id: $id, chatId: $chatId, sourceId: $sourceId) {
      ...ChatGroupFields
    }
  }
`;

export const BLOCK_CHAT_GROUP_CONTENT = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation BlockChatGroupContent($id: ID!, $chatId: String!, $contentId: String!, $remark: String) {
    blockChatGroupContent(id: $id, chatId: $chatId, contentId: $contentId, remark: $remark) {
      ...ChatGroupFields
    }
  }
`;

export const CLEAR_CHAT_GROUP_CHAT_FLAG = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation ClearChatGroupChatFlag($id: ID!, $chatId: String!, $flag: String!) {
    clearChatGroupChatFlag(id: $id, chatId: $chatId, flag: $flag) {
      ...ChatGroupFields
    }
  }
`;

export const GET_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  query GetChatGroup($id: ID!) {
    chatGroup(id: $id) {
      ...ChatGroupFields
    }
  }
`;

export const GET_CHAT_GROUPS = `#graphql
  ${CHAT_GROUP_FIELDS}
  query GetChatGroups($query: QueryInput) {
    chatGroups(query: $query) {
      ...ChatGroupFields
    }
  }
`;

export const JOIN_BOOK_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation JoinBookChatGroup($id: ID!) {
    joinBookChatGroup(id: $id) {
      ...ChatGroupFields
    }
  }
`;

export const JOIN_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation JoinChatGroup($id: ID!) {
    joinChatGroup(id: $id) {
      ...ChatGroupFields
    }
  }
`;

export const LEAVE_CHAT_GROUP = `#graphql
  ${STATUS_RESPONSE}
  mutation LeaveChatGroup($id: ID!) {
    leaveChatGroup(id: $id) {
      ...StatusResponse
    }
  }
`;

export const RECALL_CHAT_GROUP_CONTENT = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation RecallChatGroupContent($id: ID!, $chatId: String!, $contentId: String!) {
    recallChatGroupContent(id: $id, chatId: $chatId, contentId: $contentId) {
      ...ChatGroupFields
    }
  }
`;

export const SET_CHAT_GROUP_CHAT_FLAG = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation SetChatGroupChatFlag($id: ID!, $chatId: String!, $flag: String!) {
    setChatGroupChatFlag(id: $id, chatId: $chatId, flag: $flag) {
      ...ChatGroupFields
    }
  }
`;

export const SHARE_QUESTION_TO_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation ShareQuestionToChatGroup($id: ID!, $sourceId: String!) {
    shareQuestionToChatGroup(id: $id, sourceId: $sourceId) {
      ...ChatGroupFields
    }
  }
`;

export const TO_ADMIN_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation ToAdminChatGroup($content: String!) {
    toAdminChatGroup(content: $content) {
      ...ChatGroupFields
    }
  }
`;

export const TO_ALEX_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation ToAlexChatGroup($content: String!) {
    toAlexChatGroup(content: $content) {
      ...ChatGroupFields
    }
  }
`;

export const TO_TENANT_ADMINS_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation ToTenantAdminsChatGroup($tenantId: String!, $content: String!) {
    toTenantAdminsChatGroup(tenantId: $tenantId, content: $content) {
      ...ChatGroupFields
    }
  }
`;

export const TO_TENANT_COUNSELORS_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation ToTenantCounselorsChatGroup($tenantId: String!, $content: String!) {
    toTenantCounselorsChatGroup(tenantId: $tenantId, content: $content) {
      ...ChatGroupFields
    }
  }
`;

export const TO_TENANT_SUPPORTS_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation ToTenantSupportsChatGroup($tenantId: String!, $content: String!) {
    toTenantSupportsChatGroup(tenantId: $tenantId, content: $content) {
      ...ChatGroupFields
    }
  }
`;

export const UPDATE_CHAT_GROUP = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation UpdateChatGroup($id: ID!, $title: String, $description: String, $membership: String!, $logoUrl: String) {
    updateChatGroup(id: $id, title: $title, description: $description, membership: $membership, logoUrl: $logoUrl) {
      ...ChatGroupFields
    }
  }
`;

export const UPDATE_CHAT_GROUP_ADMINS = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation UpdateChatGroupAdmins($id: ID!, $userIds: [String!]!) {
    updateChatGroupAdmins(id: $id, userIds: $userIds) {
      ...ChatGroupFields
    }
  }
`;

export const UPDATE_CHAT_GROUP_CHAT_LAST_VIEWED_AT = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation UpdateChatGroupChatLastViewedAt($id: ID!, $chatId: String!, $timestamp: DateInput) {
    updateChatGroupChatLastViewedAt(id: $id, chatId: $chatId, timestamp: $timestamp) {
      ...ChatGroupFields
    }
  }
`;

export const UPDATE_CHAT_GROUP_CHAT_TITLE = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation UpdateChatGroupChatTitle($id: ID!, $chatId: String!, $title: String) {
    updateChatGroupChatTitle(id: $id, chatId: $chatId, title: $title) {
      ...ChatGroupFields
    }
  }
`;

export const UPDATE_CHAT_GROUP_USERS = `#graphql
  ${CHAT_GROUP_FIELDS}
  mutation UpdateChatGroupUsers($id: ID!, $userIds: [String!]!) {
    updateChatGroupUsers(id: $id, userIds: $userIds) {
      ...ChatGroupFields
    }
  }
`;
