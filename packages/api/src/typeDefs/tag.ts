/**
 * apollo typeDef: Tag
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    tag(id: ID!): Tag @cacheControl(maxAge: 3600)
    tags(query: QueryInput): [Tag!]! @cacheControl(maxAge: 3600)
  }

  extend type Mutation {
    addTag(tag: TagInput!): Tag!
    addTagRemark(id: ID!, remark: String!): Tag!
    removeTag(id: ID!, remark: String): StatusResponse!
    updateTag(id: ID!, tag: TagInput!): Tag!
  }

  input TagInput {
    name: LocaleInput!
    description: LocaleInput!
  }

  type Tag {
    _id: ID!
    flags: [String!]!
    name: Locale!
    description: Locale!
    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
