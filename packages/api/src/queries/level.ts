/**
 * Apollo Query: Level
 *
 */

import { gql } from 'apollo-server-core';

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const LEVEL_FIELDS = gql`
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

export const ADD_LEVEL = gql`
  ${LEVEL_FIELDS}
  mutation AddLevel($level: LevelInput!) {
    addLevel(level: $level) {
      ...LevelFields
    }
  }
`;

export const ADD_LEVEL_REMARK = gql`
  ${LEVEL_FIELDS}
  mutation AddLevelRemark($id: ID!, $remark: String!) {
    addLevelRemark(id: $id, remark: $remark) {
      ...LevelFields
    }
  }
`;

export const GET_LEVEL = gql`
  ${LEVEL_FIELDS}
  query GetLevel($id: ID!) {
    level(id: $id) {
      ...LevelFields
    }
  }
`;

export const GET_LEVELS = gql`
  ${LEVEL_FIELDS}
  query GetLevels($query: QueryInput) {
    levels(query: $query) {
      ...LevelFields
    }
  }
`;

export const REMOVE_LEVEL = gql`
  ${STATUS_RESPONSE}
  mutation RemoveLevel($id: ID!, $remark: String) {
    removeLevel(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_LEVEL = gql`
  ${LEVEL_FIELDS}
  mutation UpdateLevel($id: ID!, $level: LevelInput!) {
    updateLevel(id: $id, level: $level) {
      ...LevelFields
    }
  }
`;
