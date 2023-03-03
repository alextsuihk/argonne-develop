/**
 * Apollo Query: Publisher
 *
 */

import { gql } from 'apollo-server-core';

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const PUBLISHER_FIELDS = gql`
  ${LOCALE}
  ${REMARK}
  fragment PublisherFields on Publisher {
    _id
    flags
    name {
      ...LocaleFields
    }
    admins
    phones
    logoUrl
    website

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_PUBLISHER = gql`
  ${PUBLISHER_FIELDS}
  mutation AddPublisher($publisher: PublisherInput!) {
    addPublisher(publisher: $publisher) {
      ...PublisherFields
    }
  }
`;

export const ADD_PUBLISHER_REMARK = gql`
  ${PUBLISHER_FIELDS}
  mutation AddPublisherRemark($id: ID!, $remark: String!) {
    addPublisherRemark(id: $id, remark: $remark) {
      ...PublisherFields
    }
  }
`;

export const GET_PUBLISHER = gql`
  ${PUBLISHER_FIELDS}
  query GetPublisher($id: ID!) {
    publisher(id: $id) {
      ...PublisherFields
    }
  }
`;

export const GET_PUBLISHERS = gql`
  ${PUBLISHER_FIELDS}
  query GetPublishers($query: QueryInput) {
    publishers(query: $query) {
      ...PublisherFields
    }
  }
`;

export const REMOVE_PUBLISHER = gql`
  ${STATUS_RESPONSE}
  mutation RemovePublisher($id: ID!, $remark: String) {
    removePublisher(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_PUBLISHER = gql`
  ${PUBLISHER_FIELDS}
  mutation UpdatePublisher($id: ID!, $publisher: PublisherInput!) {
    updatePublisher(id: $id, publisher: $publisher) {
      ...PublisherFields
    }
  }
`;
