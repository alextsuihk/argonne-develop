export default `#graphql

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

  type Bid {
    bidder: String!
    bounty: Int
    contents: [String!]!
  }

  type Chat {
    _id: ID!
    flags: [String!]!
    title: String
    parents: [String!]!
    members: [Member!]!
    contents: [String!]!
    createdAt: Float!
    updatedAt: Float!
  }

  type Member {
    user: String!
    flags: [String!]!
    lastViewedAt: Float!
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
    t: Float!
    u: String
    m: String!
  }

  type Stash {
    _id: ID!
    title: String!
    secret: String!
    url: String!
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
