/**
 * Apollo Query: Common Field
 * Commonly used graphql fragments
 */

export const BID = `#graphql
  fragment BidFields on Bid {
    bidder
    bounty
    contents
  }
`;

export const LOCALE = `#graphql
  fragment LocaleFields on Locale {
    enUS
    zhCN
    zhHK
  }
`;

export const REMARK = `#graphql
  fragment RemarkFields on Remark {
    u
    t
    m
  }
`;

export const STATUS_RESPONSE = `#graphql
  fragment StatusResponse on StatusResponse {
    code
  }
`;

export const MEMBER = `#graphql
  fragment MemberFields on Member {
    user
    flags
    lastViewedAt
  }
`;

export const CHAT = `#graphql
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
