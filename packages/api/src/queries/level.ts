/**
 * Apollo Query: Level
 *
 */

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const LEVEL_FIELDS = `#graphql
  ${LOCALE}
  ${REMARK}
  fragment LevelFields on Level {
    _id
    flags
    code
    name {
      ...LocaleFields
    }
    nextLevel

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_LEVEL = `#graphql
  ${LEVEL_FIELDS}
  mutation AddLevel($level: LevelInput!) {
    addLevel(level: $level) {
      ...LevelFields
    }
  }
`;

export const ADD_LEVEL_REMARK = `#graphql
  ${LEVEL_FIELDS}
  mutation AddLevelRemark($id: ID!, $remark: String!) {
    addLevelRemark(id: $id, remark: $remark) {
      ...LevelFields
    }
  }
`;

export const GET_LEVEL = `#graphql
  ${LEVEL_FIELDS}
  query GetLevel($id: ID!) {
    level(id: $id) {
      ...LevelFields
    }
  }
`;

export const GET_LEVELS = `#graphql
  ${LEVEL_FIELDS}
  query GetLevels($query: QueryInput) {
    levels(query: $query) {
      ...LevelFields
    }
  }
`;

export const REMOVE_LEVEL = `#graphql
  ${STATUS_RESPONSE}
  mutation RemoveLevel($id: ID!, $remark: String) {
    removeLevel(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_LEVEL = `#graphql
  ${LEVEL_FIELDS}
  mutation UpdateLevel($id: ID!, $level: LevelInput!) {
    updateLevel(id: $id, level: $level) {
      ...LevelFields
    }
  }
`;
