/**
 * Apollo Query: Common Field
 * Commonly used graphql fragments
 */

import gql from 'graphql-tag';

export const BID = gql`
  fragment BidFields on Bid {
    bidder
    bounty
    contents
  }
`;

export const LOCALE = gql`
  fragment LocaleFields on Locale {
    enUS
    zhCN
    zhHK
  }
`;

export const REMARK = gql`
  fragment RemarkFields on Remark {
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

export const MEMBER = gql`
  fragment MemberFields on Member {
    user
    flags
    lastViewedAt
  }
`;

export const CHAT = gql`
  ${MEMBER}
  fragment ChatFields on Chat {
    _id
    flags
    parents
    title
    members {
      ...MemberFields
    }
    contents
    createdAt
    updatedAt
  }
`;
