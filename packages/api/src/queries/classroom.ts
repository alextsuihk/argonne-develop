/**
 * Apollo Query: Classroom
 *
 */

import { gql } from 'apollo-server-core';

import { REMARK, STATUS_RESPONSE } from './common';

export const CLASSROOM_FIELDS = gql`
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

    chats
    assignments

    remarks {
      ...RemarkFields
    }

    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_CLASSROOM = gql`
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

export const ADD_CLASSROOM_REMARK = gql`
  ${CLASSROOM_FIELDS}
  mutation AddClassroomRemark($id: ID!, $remark: String!) {
    addClassroomRemark(id: $id, remark: $remark) {
      ...ClassroomFields
    }
  }
`;

export const ADD_CLASSROOM_STUDENTS = gql`
  ${CLASSROOM_FIELDS}
  mutation AddClassroomStudents($id: ID!, $userIds: [String!]!) {
    addClassroomStudents(id: $id, userIds: $userIds) {
      ...ClassroomFields
    }
  }
`;

export const ADD_CLASSROOM_TEACHERS = gql`
  ${CLASSROOM_FIELDS}
  mutation AddClassroomTeachers($id: ID!, $userIds: [String!]!) {
    addClassroomTeachers(id: $id, userIds: $userIds) {
      ...ClassroomFields
    }
  }
`;

export const GET_CLASSROOM = gql`
  ${CLASSROOM_FIELDS}
  query GetClassroom($id: ID!) {
    classroom(id: $id) {
      ...ClassroomFields
    }
  }
`;

export const GET_CLASSROOMS = gql`
  ${CLASSROOM_FIELDS}
  query GetClassrooms($query: QueryInput) {
    classrooms(query: $query) {
      ...ClassroomFields
    }
  }
`;

export const RECOVER_CLASSROOM = gql`
  ${CLASSROOM_FIELDS}
  mutation RecoverClassroom($id: ID!, $remark: String) {
    recoverClassroom(id: $id, remark: $remark) {
      ...ClassroomFields
    }
  }
`;

export const REMOVE_CLASSROOM = gql`
  ${STATUS_RESPONSE}
  mutation RemoveClassroom($id: ID!, $remark: String) {
    removeClassroom(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const REMOVE_CLASSROOM_STUDENTS = gql`
  ${CLASSROOM_FIELDS}
  mutation RemoveClassroomStudents($id: ID!, $userIds: [String!]!) {
    removeClassroomStudents(id: $id, userIds: $userIds) {
      ...ClassroomFields
    }
  }
`;

export const REMOVE_CLASSROOM_TEACHERS = gql`
  ${CLASSROOM_FIELDS}
  mutation RemoveClassroomTeachers($id: ID!, $userIds: [String!]!) {
    removeClassroomTeachers(id: $id, userIds: $userIds) {
      ...ClassroomFields
    }
  }
`;

export const UPDATE_CLASSROOM = gql`
  ${CLASSROOM_FIELDS}
  mutation UpdateClassroom($id: ID!, $title: String, $room: String, $schedule: String, $books: [String!]!) {
    updateClassroom(id: $id, title: $title, room: $room, schedule: $schedule, books: $books) {
      ...ClassroomFields
    }
  }
`;
