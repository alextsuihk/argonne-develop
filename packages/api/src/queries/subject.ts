/**
 * Apollo Query: Subject
 *
 */

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const SUBJECT_FIELDS = `#graphql
  ${LOCALE}
  ${REMARK}
  fragment SubjectFields on Subject {
    _id
    flags
    name {
      ...LocaleFields
    }
    levels

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_SUBJECT = `#graphql
  ${SUBJECT_FIELDS}
  mutation AddSubject($subject: SubjectInput!) {
    addSubject(subject: $subject) {
      ...SubjectFields
    }
  }
`;

export const ADD_SUBJECT_REMARK = `#graphql
  ${SUBJECT_FIELDS}
  mutation AddSubjectRemark($id: ID!, $remark: String!) {
    addSubjectRemark(id: $id, remark: $remark) {
      ...SubjectFields
    }
  }
`;

export const GET_SUBJECT = `#graphql
  ${SUBJECT_FIELDS}
  query GetSubject($id: ID!) {
    subject(id: $id) {
      ...SubjectFields
    }
  }
`;

export const GET_SUBJECTS = `#graphql
  ${SUBJECT_FIELDS}
  query GET_SUBJECTS($query: QueryInput) {
    subjects(query: $query) {
      ...SubjectFields
    }
  }
`;

export const REMOVE_SUBJECT = `#graphql
  ${STATUS_RESPONSE}
  mutation RemoveSubject($id: ID!, $remark: String) {
    removeSubject(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_SUBJECT = `#graphql
  ${SUBJECT_FIELDS}
  mutation UpdateSubject($id: ID!, $subject: SubjectInput!) {
    updateSubject(id: $id, subject: $subject) {
      ...SubjectFields
    }
  }
`;
