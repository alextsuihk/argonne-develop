/**
 * apollo typeDef: Announcement
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    announcement(id: ID!): Announcement
    announcements(query: QueryInput): [Announcement!]!
  }

  extend type Mutation {
    addAnnouncement(announcement: AnnouncementInput!): Announcement!
    removeAnnouncement(id: ID!): StatusResponse!
  }

  input AnnouncementInput {
    tenantId: String
    title: String!
    message: String!
    beginAt: DateInput!
    endAt: DateInput!
  }

  type Announcement {
    _id: ID!
    flags: [String!]!
    tenant: String
    title: String!
    message: String!
    beginAt: Float!
    endAt: Float!
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
