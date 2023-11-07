/**
 * apollo typeDef: Satellite
 */

export default `#graphql
  extend type Query {
    satelliteToken(tenantId: String!): TokenWithExpireAt!
  }
  extend type Mutation {
    setupSatellite(token: String!): StatusResponse!
  }
`;
