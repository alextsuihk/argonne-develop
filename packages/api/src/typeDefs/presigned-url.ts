/**
 * apollo typeDef: Presigned-Url
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Mutation {
    addPresignedUrl(bucketType: String!, ext: String!): PresignedUrl!
  }

  type PresignedUrl {
    url: String!
    expiry: Int!
  }
`;
