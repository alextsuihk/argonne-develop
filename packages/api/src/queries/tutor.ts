/**
 * Apollo Query: Tutor
 *
 */

import { gql } from 'apollo-server-core';

import { REMARK, STATUS_RESPONSE } from './common';

const TUTOR_FIELDS = gql`
  ${REMARK}
  fragment TutorFields on Tutor {
    _id
    flags
    tenant
    user
    intro
    officeHour
    credentials {
      _id
      title
      proofs
      updatedAt
      verifiedAt
    }
    specialties {
      _id
      note
      lang
      level
      subject
      ranking {
        correctness
        punctuality
        explicitness
      }
    }
    rankingUpdatedAt
    star

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const GET_TUTOR = gql`
  ${TUTOR_FIELDS}
  query GetTutor($id: ID!) {
    tutor(id: $id) {
      ...TutorFields
    }
  }
`;

export const GET_TUTORS = gql`
  ${TUTOR_FIELDS}
  query GetTutors($query: QueryInput) {
    tutors(query: $query) {
      ...TutorFields
    }
  }
`;

export const ADD_TUTOR = gql`
  ${TUTOR_FIELDS}
  mutation AddTutor($tenantId: String!, $userId: String!) {
    addTutor(tenantId: $tenantId, userId: $userId) {
      ...TutorFields
    }
  }
`;

export const ADD_TUTOR_CREDENTIAL = gql`
  ${TUTOR_FIELDS}
  mutation AddTutorCredential($id: ID!, $title: String!, $proofs: [String!]!) {
    addTutorCredential(id: $id, title: $title, proofs: $proofs) {
      ...TutorFields
    }
  }
`;

export const ADD_TUTOR_REMARK = gql`
  ${TUTOR_FIELDS}
  mutation AddTutorRemark($id: ID!, $remark: String!) {
    addTutorRemark(id: $id, remark: $remark) {
      ...TutorFields
    }
  }
`;

export const ADD_TUTOR_SPECIALTY = gql`
  ${TUTOR_FIELDS}
  mutation AddTutorSpecialty($id: ID!, $note: String, $lang: String!, $level: String!, $subject: String!) {
    addTutorSpecialty(id: $id, note: $note, lang: $lang, level: $level, subject: $subject) {
      ...TutorFields
    }
  }
`;

export const REMOVE_TUTOR = gql`
  ${STATUS_RESPONSE}
  mutation RemoveTutor($id: ID!, $remark: String) {
    removeTutor(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const REMOVE_TUTOR_CREDENTIAL = gql`
  ${TUTOR_FIELDS}
  mutation RemoveTutorCredential($id: ID!, $credentialId: String!) {
    removeTutorCredential(id: $id, credentialId: $credentialId) {
      ...TutorFields
    }
  }
`;

export const REMOVE_TUTOR_SPECIALTY = gql`
  ${TUTOR_FIELDS}
  mutation RemoveTutorSpecialty($id: ID!, $specialtyId: String!) {
    removeTutorSpecialty(id: $id, specialtyId: $specialtyId) {
      ...TutorFields
    }
  }
`;

export const UPDATE_TUTOR = gql`
  ${TUTOR_FIELDS}
  mutation UpdateTutor($id: ID!, $intro: String!, $officeHour: String) {
    updateTutor(id: $id, intro: $intro, officeHour: $officeHour) {
      ...TutorFields
    }
  }
`;

export const VERIFY_TUTOR_CREDENTIAL = gql`
  ${TUTOR_FIELDS}
  mutation VerifyTutorCredential($id: ID!, $credentialId: String!) {
    verifyTutorCredential(id: $id, credentialId: $credentialId) {
      ...TutorFields
    }
  }
`;
