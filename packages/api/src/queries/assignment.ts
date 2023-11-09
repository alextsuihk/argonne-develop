/**
 * Apollo Query: Assignment
 *
 */

import gql from 'graphql-tag';

import { BOOK_ASSIGNMENT_FIELDS } from './book';
import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

export const ASSIGNMENT_FIELDS = gql`
  ${BOOK_ASSIGNMENT_FIELDS}
  ${LOCALE}
  ${REMARK}
  fragment AssignmentFields on Assignment {
    _id
    flags
    classroom
    chapter
    title
    deadline

    bookAssignments {
      ...BookAssignmentFields
    }
    manualAssignments
    maxScores

    job
    homeworks {
      _id
      flags

      user
      assignmentIdx
      dynParamIdx

      contents
      answer
      answeredAt

      timeSpent
      viewedExamples
      scores

      questions

      createdAt
      updatedAt
    }

    createdAt
    updatedAt
    deletedAt

    contentsToken
  }
`;

export const GET_ASSIGNMENT = gql`
  ${ASSIGNMENT_FIELDS}
  query GetAssignment($id: ID!) {
    user(id: $id) {
      ...AssignmentFields
    }
  }
`;

export const GET_ASSIGNMENTS = gql`
  ${ASSIGNMENT_FIELDS}
  query GetAssignments($query: QueryInput) {
    users(query: $query) {
      ...AssignmentFields
    }
  }
`;

export const ADD_ASSIGNMENT = gql`
  ${ASSIGNMENT_FIELDS}
  mutation AddAssignment($assignment: AssignmentInput!) {
    addAssignment(assignment: $assignment) {
      ...AssignmentFields
    }
  }
`;

export const GRADE_ASSIGNMENT = gql`
  ${ASSIGNMENT_FIELDS}
  mutation GradeAssignment($id: ID!, $homeworkId: String!,  $content: String, score: Int ) {
    gradeAssignment(id: $id, homeworkId: $homeworkId, content: $content, score: $score) {
      ...AssignmentFields
    }
  }
`;

export const REMOVE_ASSIGNMENT = gql`
  ${STATUS_RESPONSE}
  mutation RemoveAssignment($id: ID!, $remark: String) {
    removeAssignment(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_ASSIGNMENT = gql`
  ${ASSIGNMENT_FIELDS}
  mutation UpdateAssignment($id: ID!, $deadline: DateInput!) {
    updateAssignment(id: $id, deadline: $deadline) {
      ...AssignmentFields
    }
  }
`;
