/**
 * Apollo Query: Publisher
 *
 */

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const PUBLISHER_FIELDS = `#graphql
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

export const ADD_PUBLISHER = `#graphql
  ${PUBLISHER_FIELDS}
  mutation AddPublisher($publisher: PublisherInput!) {
    addPublisher(publisher: $publisher) {
      ...PublisherFields
    }
  }
`;

export const ADD_PUBLISHER_REMARK = `#graphql
  ${PUBLISHER_FIELDS}
  mutation AddPublisherRemark($id: ID!, $remark: String!) {
    addPublisherRemark(id: $id, remark: $remark) {
      ...PublisherFields
    }
  }
`;

export const GET_PUBLISHER = `#graphql
  ${PUBLISHER_FIELDS}
  query GetPublisher($id: ID!) {
    publisher(id: $id) {
      ...PublisherFields
    }
  }
`;

export const GET_PUBLISHERS = `#graphql
  ${PUBLISHER_FIELDS}
  query GetPublishers($query: QueryInput) {
    publishers(query: $query) {
      ...PublisherFields
    }
  }
`;

export const REMOVE_PUBLISHER = `#graphql
  ${STATUS_RESPONSE}
  mutation RemovePublisher($id: ID!, $remark: String) {
    removePublisher(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_PUBLISHER = `#graphql
  ${PUBLISHER_FIELDS}
  mutation UpdatePublisher($id: ID!, $publisher: PublisherInput!) {
    updatePublisher(id: $id, publisher: $publisher) {
      ...PublisherFields
    }
  }
`;
