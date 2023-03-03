/**
 * apollo typeDef: Analytic
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Mutation {
    analyticSession(fullscreen: Boolean!, token: String!, coordinates: CoordinatesInput): StatusResponse!
  }
`;
