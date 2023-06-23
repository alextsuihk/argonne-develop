/**
 * Apollo Query: Chat
 *
 */

import { gql } from 'apollo-server-core';

import { MEMBER } from './common';

const CHAT_FIELDS = gql`
  ${MEMBER}
  fragment ChatFields on Chat {
    _id
    flags
    parents
    title
    members {
      ...MemberFields
    }
    contents
    contentsToken
    createdAt
    updatedAt
  }
`;

export const ADD_CHAT = gql`
  ${CHAT_FIELDS}
  mutation AddChat($id: ID, $title: String, $parent: String!, $content: String!) {
    addChat(id: $id, title: $title, parent: $parent, content: $content) {
      ...ChatFields
    }
  }
`;

export const ATTACH_CHAT_TO_CLASSROOM = gql`
  ${CHAT_FIELDS}
  mutation AttachChat($id: ID!, $parent: String!, $classroomId: String!) {
    attachChatToClassroom(id: $id, parent: $parent, classroomId: $classroomId) {
      ...ChatFields
    }
  }
`;

export const BLOCK_CHAT_CONTENT = gql`
  ${CHAT_FIELDS}
  mutation BockChatContent($id: ID!, $parent: String!, $contentId: String!, $remark: String) {
    blockChatContent(id: $id, parent: $parent, contentId: $contentId, remark: $remark) {
      ...ChatFields
    }
  }
`;

export const CLEAR_CHAT_FLAG = gql`
  ${CHAT_FIELDS}
  mutation ClearChatFlag($id: ID!, $parent: String!, $flag: String!) {
    clearChatFlag(id: $id, parent: $parent, flag: $flag) {
      ...ChatFields
    }
  }
`;

// TODO: remove EOL
// export const GET_CHAT = gql`
//   ${CHAT_FIELDS}
//   query GetChat($id: ID!) {
//     chat(id: $id) {
//       ...ChatFields
//     }
//   }
// `;

// export const GET_CHATS = gql`
//   ${CHAT_FIELDS}
//   query GetChats($query: QueryInput) {
//     chats(query: $query) {
//       ...ChatFields
//     }
//   }
// `;

export const RECALL_CHAT_CONTENT = gql`
  ${CHAT_FIELDS}
  mutation RecallChatContent($id: ID!, $parent: String!, $contentId: String!) {
    recallChatContent(id: $id, parent: $parent, contentId: $contentId) {
      ...ChatFields
    }
  }
`;

export const SET_CHAT_FLAG = gql`
  ${CHAT_FIELDS}
  mutation SetChatFlag($id: ID!, $parent: String!, $flag: String!) {
    setChatFlag(id: $id, parent: $parent, flag: $flag) {
      ...ChatFields
    }
  }
`;

export const UPDATE_CHAT_LAST_VIEWED_AT = gql`
  ${CHAT_FIELDS}
  mutation UpdateChatLastViewedAt($id: ID!, $parent: String!, $timestamp: DateInput!) {
    updateChatLastViewedAt(id: $id, parent: $parent, timestamp: $timestamp) {
      ...ChatFields
    }
  }
`;

export const UPDATE_CHAT_TITLE = gql`
  ${CHAT_FIELDS}
  mutation UpdateChatTitle($id: ID!, $parent: String!, $title: String) {
    updateChatTitle(id: $id, parent: $parent, title: $title) {
      ...ChatFields
    }
  }
`;
