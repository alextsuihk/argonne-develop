/**
 * Apollo Query: School
 *
 */

import gql from 'graphql-tag';

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const SCHOOL_FIELDS = gql`
  ${LOCALE}
  ${REMARK}
  fragment SchoolFields on School {
    _id
    flags
    code
    name {
      ...LocaleFields
    }

    address {
      enUS
      zhCN
      zhHK
    }
    district
    location {
      coordinates
    }

    phones
    emi
    band
    logoUrl
    website
    funding
    gender
    religion
    levels

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_SCHOOL = gql`
  ${SCHOOL_FIELDS}
  mutation AddSchool($school: SchoolInput!) {
    addSchool(school: $school) {
      ...SchoolFields
    }
  }
`;

export const ADD_SCHOOL_REMARK = gql`
  ${SCHOOL_FIELDS}
  mutation AddSchoolRemark($id: ID!, $remark: String!) {
    addSchoolRemark(id: $id, remark: $remark) {
      ...SchoolFields
    }
  }
`;

export const GET_SCHOOL = gql`
  ${SCHOOL_FIELDS}
  query GetSchool($id: ID!) {
    school(id: $id) {
      ...SchoolFields
    }
  }
`;

export const GET_SCHOOLS = gql`
  ${SCHOOL_FIELDS}
  query GetSchools($query: QueryInput) {
    schools(query: $query) {
      ...SchoolFields
    }
  }
`;

export const REMOVE_SCHOOL = gql`
  ${STATUS_RESPONSE}
  mutation RemoveSchool($id: ID!, $remark: String) {
    removeSchool(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_SCHOOL = gql`
  ${SCHOOL_FIELDS}
  mutation UpdateSchool($id: ID!, $school: SchoolInput!) {
    updateSchool(id: $id, school: $school) {
      ...SchoolFields
    }
  }
`;
