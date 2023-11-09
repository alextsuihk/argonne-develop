/**
 * apollo typeDef: Satellite
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    satelliteToken(tenantId: String!): TokenWithExpireAt!
  }
  extend type Mutation {
    setupSatellite(token: String!): StatusResponse!
  }
`;
