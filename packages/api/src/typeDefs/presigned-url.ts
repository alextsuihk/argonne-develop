/**
 * apollo typeDef: Presigned-Url
 */

export default `#graphql
  extend type Mutation {
    addPresignedUrl(bucketType: String!, ext: String!): PresignedUrl!
  }

  type PresignedUrl {
    url: String!
    expiry: Int!
  }
`;
