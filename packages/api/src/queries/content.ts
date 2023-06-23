/**
 * Apollo Query: Content
 *
 */

import { gql } from 'apollo-server-core';

const CONTENT_FIELDS = gql`
  fragment ContentFields on Content {
    _id
    flags
    parents
    creator
    data
    createdAt
    updatedAt

    createdAt
    updatedAt
    deletedAt
  }
`;

export const GET_CONTENTS = gql`
  ${CONTENT_FIELDS}
  query GetContents($token: String!, $query: QueryInput) {
    contents(token: $token, query: $query) {
      ...ContentFields
    }
  }
`;
