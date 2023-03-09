import { gql } from 'apollo-server-express';

export default gql`
  directive @deprecated(reason: String = "No longer supported") on FIELD_DEFINITION | ENUM_VALUE

  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
    inheritMaxAge: Boolean
  ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

  scalar DateInput

  type Query {
    _: String # empty entry
    content(id: ID!, token: String!, updateAfter: DateInput): Content
  }
  type Mutation {
    _: String # empty entry
  }

  input CoordinatesInput {
    lng: Float
    lat: Float
  }
  input LocaleInput {
    enUS: String
    zhHK: String
    zhCN: String
  }

  input QueryInput {
    search: String
    updatedAfter: DateInput
    updatedBefore: DateInput
    skipDeleted: Boolean
  }

  type Content {
    _id: ID!
    flags: [String!]!
    parents: [String!]!
    creator: String!
    data: String!
    createdAt: Float!
    updatedAt: Float!
  }

  type Member {
    user: String!
    flags: [String!]!
    lastViewedAt: Float
    ranking: Int
  }

  type Locale {
    enUS: String
    zhHK: String
    zhCN: String
  }

  type LocationPoint {
    type: String
    coordinates: [String!]
  }

  type Remark {
    _id: ID!
    t: Float!
    u: String
    m: String!
  }

  # standard successful response, code is HTTP status
  type StatusResponse {
    code: String!
  }

  type TokenWithExpireAt {
    token: String!
    expireAt: Float!
  }
`;
