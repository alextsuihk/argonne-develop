/**
 * Apollo Query: District
 *
 */

import gql from 'graphql-tag';

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const DISTRICT_FIELDS = gql`
  ${LOCALE}
  ${REMARK}
  fragment DistrictFields on District {
    _id
    flags
    name {
      ...LocaleFields
    }
    region {
      ...LocaleFields
    }
    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_DISTRICT = gql`
  ${DISTRICT_FIELDS}
  mutation AddDistrict($district: DistrictInput!) {
    addDistrict(district: $district) {
      ...DistrictFields
    }
  }
`;

export const ADD_DISTRICT_REMARK = gql`
  ${DISTRICT_FIELDS}
  mutation AddDistrictRemark($id: ID!, $remark: String!) {
    addDistrictRemark(id: $id, remark: $remark) {
      ...DistrictFields
    }
  }
`;

export const GET_DISTRICT = gql`
  ${DISTRICT_FIELDS}
  query GetDistrict($id: ID!) {
    district(id: $id) {
      ...DistrictFields
    }
  }
`;

export const GET_DISTRICTS = gql`
  ${DISTRICT_FIELDS}
  query GetDistricts($query: QueryInput) {
    districts(query: $query) {
      ...DistrictFields
    }
  }
`;

export const REMOVE_DISTRICT = gql`
  ${STATUS_RESPONSE}
  mutation RemoveDistrict($id: ID!, $remark: String) {
    removeDistrict(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_DISTRICT = gql`
  ${DISTRICT_FIELDS}
  mutation UpdateDistrict($id: ID!, $district: DistrictInput!) {
    updateDistrict(id: $id, district: $district) {
      ...DistrictFields
    }
  }
`;
