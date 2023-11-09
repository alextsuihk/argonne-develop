/**
 * apollo typeDef: Publisher
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    publisher(id: ID!): Publisher @cacheControl(maxAge: 3600)
    publishers(query: QueryInput): [Publisher!]! @cacheControl(maxAge: 3600)
  }

  extend type Mutation {
    addPublisher(publisher: PublisherInput!): Publisher!
    addPublisherRemark(id: ID!, remark: String!): Publisher!
    removePublisher(id: ID!, remark: String): StatusResponse!
    updatePublisher(id: ID!, publisher: PublisherInput!): Publisher!
  }

  input PublisherInput {
    admins: [String!]!
    name: LocaleInput!
    phones: [String!]!
    logoUrl: String
    website: String
  }

  type Publisher {
    _id: ID!
    flags: [String!]!
    name: Locale
    admins: [String!]!
    phones: [String!]!
    logoUrl: String
    website: String
    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
