/**
 * Apollo Query: Classroom
 *
 */

import { CHAT, REMARK, STATUS_RESPONSE } from './common';

export const CLASSROOM_FIELDS = `#graphql
  ${CHAT}
  ${REMARK}
  fragment ClassroomFields on Classroom {
    _id
    flags
    tenant
    level
    subject
    year
    schoolClass
    title
    room
    schedule
    books
    teachers
    students

    chats {
      ...ChatFields
    }

    assignments

    remarks {
      ...RemarkFields
    }

    createdAt
    updatedAt
    deletedAt

    contentsToken
  }
`;

export const ADD_CLASSROOM = `#graphql
  ${CLASSROOM_FIELDS}
  mutation AddClassroom(
    $tenantId: String!
    $level: String!
    $subject: String!
    $year: String!
    $schoolClass: String!
    $title: String
    $room: String
    $schedule: String
    $books: [String!]!
  ) {
    addClassroom(
      tenantId: $tenantId
      level: $level
      subject: $subject
      year: $year
      schoolClass: $schoolClass
      title: $title
      room: $room
      schedule: $schedule
      books: $books
    ) {
      ...ClassroomFields
    }
  }
`;

export const ADD_CLASSROOM_CONTENT = `#graphql
  ${CLASSROOM_FIELDS}
  mutation AddClassroomContent($id: ID!, $chatId: String!, $content: String!, $visibleAfter: DateInput) {
    addClassroomContent(id: $id, chatId: $chatId, content: $content, visibleAfter: $visibleAfter) {
      ...ClassroomFields
    }
  }
`;

export const ADD_CLASSROOM_CONTENT_WITH_NEW_CHAT = `#graphql
  ${CLASSROOM_FIELDS}
  mutation AddClassroomContentWithNewChat($id: ID!, $content: String!, $visibleAfter: DateInput) {
    addClassroomContentWithNewChat(id: $id, content: $content, visibleAfter: $visibleAfter) {
      ...ClassroomFields
    }
  }
`;

export const ADD_CLASSROOM_REMARK = `#graphql
  ${CLASSROOM_FIELDS}
  mutation AddClassroomRemark($id: ID!, $remark: String!) {
    addClassroomRemark(id: $id, remark: $remark) {
      ...ClassroomFields
    }
  }
`;

export const ATTACH_CHAT_GROUP_TO_CLASSROOM = `#graphql
  ${CLASSROOM_FIELDS}
  mutation AttachChatGroupChatToClassroom($id: ID!, $chatId: String!, $sourceId: String!) {
    attachChatGroupChatToClassroom(id: $id, chatId: $chatId, sourceId: $sourceId) {
      ...ClassroomFields
    }
  }
`;

export const ATTACH_CLASSROOM_TO_CLASSROOM = `#graphql
  ${CLASSROOM_FIELDS}
  mutation AttachClassroomChatToClassroom($id: ID!, $chatId: String!, $sourceId: String!) {
    attachClassroomChatToClassroom(id: $id, chatId: $chatId, sourceId: $sourceId) {
      ...ClassroomFields
    }
  }
`;

export const BLOCK_CLASSROOM_CONTENT = `#graphql
  ${CLASSROOM_FIELDS}
  mutation BlockClassroomContent($id: ID!, $chatId: String!, $contentId: String!, $remark: String) {
    blockClassroomContent(id: $id, chatId: $chatId, contentId: $contentId, remark: $remark) {
      ...ClassroomFields
    }
  }
`;

export const CLEAR_CLASSROOM_CHAT_FLAG = `#graphql
  ${CLASSROOM_FIELDS}
  mutation ClearClassroomChatFlag($id: ID!, $chatId: String!, $flag: String!) {
    clearClassroomChatFlag(id: $id, chatId: $chatId, flag: $flag) {
      ...ClassroomFields
    }
  }
`;

export const GET_CLASSROOM = `#graphql
  ${CLASSROOM_FIELDS}
  query GetClassroom($id: ID!) {
    classroom(id: $id) {
      ...ClassroomFields
    }
  }
`;

export const GET_CLASSROOMS = `#graphql
  ${CLASSROOM_FIELDS}
  query GetClassrooms($query: QueryInput) {
    classrooms(query: $query) {
      ...ClassroomFields
    }
  }
`;

export const RECALL_CLASSROOM_CONTENT = `#graphql
  ${CLASSROOM_FIELDS}
  mutation RecallClassroomContent($id: ID!, $chatId: String!, $contentId: String!) {
    recallClassroomContent(id: $id, chatId: $chatId, contentId: $contentId) {
      ...ClassroomFields
    }
  }
`;

export const RECOVER_CLASSROOM = `#graphql
  ${CLASSROOM_FIELDS}
  mutation RecoverClassroom($id: ID!, $remark: String) {
    recoverClassroom(id: $id, remark: $remark) {
      ...ClassroomFields
    }
  }
`;

export const REMOVE_CLASSROOM = `#graphql
  ${STATUS_RESPONSE}
  mutation RemoveClassroom($id: ID!, $remark: String) {
    removeClassroom(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const SET_CLASSROOM_CHAT_FLAG = `#graphql
  ${CLASSROOM_FIELDS}
  mutation SetClassroomChatFlag($id: ID!, $chatId: String!, $flag: String!) {
    setClassroomChatFlag(id: $id, chatId: $chatId, flag: $flag) {
      ...ClassroomFields
    }
  }
`;

export const SHARE_HOMEWORK_TO_CLASSROOM = `#graphql
  ${CLASSROOM_FIELDS}
  mutation ShareHomeworkToClassroom($id: ID!, $sourceId: String!) {
    shareHomeworkToClassroom(id: $id, sourceId: $sourceId) {
      ...ClassroomFields
    }
  }
`;

export const SHARE_QUESTION_TO_CLASSROOM = `#graphql
  ${CLASSROOM_FIELDS}
  mutation ShareQuestionToClassroom($id: ID!, $sourceId: String!) {
    shareQuestionToClassroom(id: $id, sourceId: $sourceId) {
      ...ClassroomFields
    }
  }
`;

export const UPDATE_CLASSROOM = `#graphql
  ${CLASSROOM_FIELDS}
  mutation UpdateClassroom($id: ID!, $title: String, $room: String, $schedule: String, $books: [String!]!) {
    updateClassroom(id: $id, title: $title, room: $room, schedule: $schedule, books: $books) {
      ...ClassroomFields
    }
  }
`;

export const UPDATE_CLASSROOM_CHAT_LAST_VIEWED_AT = `#graphql
  ${CLASSROOM_FIELDS}
  mutation UpdateClassroomChatLastViewedAt($id: ID!, $chatId: String!, $timestamp: DateInput) {
    updateClassroomChatLastViewedAt(id: $id, chatId: $chatId, timestamp: $timestamp) {
      ...ClassroomFields
    }
  }
`;

export const UPDATE_CLASSROOM_CHAT_TITLE = `#graphql
  ${CLASSROOM_FIELDS}
  mutation UpdateClassroomChatTitle($id: ID!, $chatId: String!, $title: String) {
    updateClassroomChatTitle(id: $id, chatId: $chatId, title: $title) {
      ...ClassroomFields
    }
  }
`;

export const UPDATE_CLASSROOM_STUDENTS = `#graphql
  ${CLASSROOM_FIELDS}
  mutation UpdateClassroomStudents($id: ID!, $userIds: [String!]!) {
    updateClassroomStudents(id: $id, userIds: $userIds) {
      ...ClassroomFields
    }
  }
`;

export const UPDATE_CLASSROOM_TEACHERS = `#graphql
  ${CLASSROOM_FIELDS}
  mutation UpdateClassroomTeachers($id: ID!, $userIds: [String!]!) {
    updateClassroomTeachers(id: $id, userIds: $userIds) {
      ...ClassroomFields
    }
  }
`;
