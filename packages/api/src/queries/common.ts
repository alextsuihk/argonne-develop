/**
 * Apollo Query: Common Field
 * Commonly used graphql fragments
 */

import { gql } from 'apollo-server-express';

export const LOCALE = gql`
  fragment LocaleFields on Locale {
    enUS
    zhCN
    zhHK
  }
`;

export const REMARK = gql`
  fragment RemarkFields on Remark {
    _id
    u
    t
    m
  }
`;

export const STATUS_RESPONSE = gql`
  fragment StatusResponse on StatusResponse {
    code
  }
`;

export const CONTRIBUTION = gql`
  fragment ContributionFields on Contribution {
    _id
    flags
    title
    description
    contributors {
      _id
      user
      name
      school
    }
    urls
    book
    chapter
  }
`;

export const CONTENT = gql`
  fragment ContentFields on Content {
    _id
    flags
    parents
    creator
    data
    createdAt
    updatedAt
  }
`;

export const MEMBER = gql`
  fragment MemberFields on Member {
    user
    flags
    lastViewedAt
  }
`;

export const GET_CONTENT = gql`
  ${CONTENT}
  query GetContent($id: ID!, $token: String!, $updateAfter: DateInput) {
    content(id: $id, token: $token, updateAfter: $updateAfter) {
      ...ContentFields
    }
  }
`;
