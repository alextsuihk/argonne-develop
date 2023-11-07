/**
 * Apollo Query: Tutor
 *
 */

import { REMARK } from './common';

const TUTOR_FIELDS = `#graphql
  ${REMARK}
  fragment TutorFields on Tutor {
    _id
    flags
    name
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
      tenant
      note
      langs
      level
      subject
    }

    rankings {
      level
      subject
      correctness
      explicitness
      punctuality
    }
    star

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const GET_TUTOR = `#graphql
  ${TUTOR_FIELDS}
  query GetTutor($id: ID!) {
    tutor(id: $id) {
      ...TutorFields
    }
  }
`;

export const GET_TUTORS = `#graphql
  ${TUTOR_FIELDS}
  query GetTutors($query: QueryInput) {
    tutors(query: $query) {
      ...TutorFields
    }
  }
`;

export const ADD_TUTOR_CREDENTIAL = `#graphql
  ${TUTOR_FIELDS}
  mutation AddTutorCredential($title: String!, $proofs: [String!]!) {
    addTutorCredential(title: $title, proofs: $proofs) {
      ...TutorFields
    }
  }
`;

export const ADD_TUTOR_REMARK = `#graphql
  ${TUTOR_FIELDS}
  mutation AddTutorRemark($id: ID!, $remark: String!) {
    addTutorRemark(id: $id, remark: $remark) {
      ...TutorFields
    }
  }
`;

export const ADD_TUTOR_SPECIALTY = `#graphql
  ${TUTOR_FIELDS}
  mutation AddTutorSpecialty(
    $tenantId: String!
    $note: String
    $langs: [String!]!
    $level: String!
    $subject: String!
  ) {
    addTutorSpecialty(tenantId: $tenantId, note: $note, langs: $langs, level: $level, subject: $subject) {
      ...TutorFields
    }
  }
`;

export const REMOVE_TUTOR_CREDENTIAL = `#graphql
  ${TUTOR_FIELDS}
  mutation RemoveTutorCredential($subId: String!) {
    removeTutorCredential(subId: $subId) {
      ...TutorFields
    }
  }
`;

export const REMOVE_TUTOR_SPECIALTY = `#graphql
  ${TUTOR_FIELDS}
  mutation RemoveTutorSpecialty($subId: String!) {
    removeTutorSpecialty(subId: $subId) {
      ...TutorFields
    }
  }
`;

export const UPDATE_TUTOR = `#graphql
  ${TUTOR_FIELDS}
  mutation UpdateTutor($intro: String, $officeHour: String) {
    updateTutor(intro: $intro, officeHour: $officeHour) {
      ...TutorFields
    }
  }
`;

export const VERIFY_TUTOR_CREDENTIAL = `#graphql
  ${TUTOR_FIELDS}
  mutation VerifyTutorCredential($id: ID!, $subId: String!) {
    verifyTutorCredential(id: $id, subId: $subId) {
      ...TutorFields
    }
  }
`;
