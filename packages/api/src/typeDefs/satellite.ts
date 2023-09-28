/**
 * apollo typeDef: Satellite
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Mutation {
    setupSatellite(token: String!): StatusResponse!
  }
`;
