/**
 * apollo typeDef: Satellite
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    satelliteToken(tenantId: String!): TokenWithExpireAt!
  }
  extend type Mutation {
    setupSatellite(token: String!): StatusResponse!
  }
`;
