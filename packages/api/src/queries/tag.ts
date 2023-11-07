/**
 * Apollo Query: Tag
 *
 */

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const TAG_FIELDS = `#graphql
  ${LOCALE}
  ${REMARK}
  fragment TagFields on Tag {
    _id
    flags
    name {
      ...LocaleFields
    }
    description {
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

export const ADD_TAG = `#graphql
  ${TAG_FIELDS}
  mutation AddTag($tag: TagInput!) {
    addTag(tag: $tag) {
      ...TagFields
    }
  }
`;

export const ADD_TAG_REMARK = `#graphql
  ${TAG_FIELDS}
  mutation AddTagRemark($id: ID!, $remark: String!) {
    addTagRemark(id: $id, remark: $remark) {
      ...TagFields
    }
  }
`;

export const GET_TAG = `#graphql
  ${TAG_FIELDS}
  query GetTag($id: ID!) {
    tag(id: $id) {
      ...TagFields
    }
  }
`;

export const GET_TAGS = `#graphql
  ${TAG_FIELDS}
  query GetTags($query: QueryInput) {
    tags(query: $query) {
      ...TagFields
    }
  }
`;

export const REMOVE_TAG = `#graphql
  ${STATUS_RESPONSE}
  mutation RemoveTag($id: ID!, $remark: String) {
    removeTag(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_TAG = `#graphql
  ${TAG_FIELDS}
  mutation UpdateTag($id: ID!, $tag: TagInput!) {
    updateTag(id: $id, tag: $tag) {
      ...TagFields
    }
  }
`;
