/**
 * apollo typeDef: Analytic
 */

import gql from 'graphql-tag';

export default gql`
  extend type Mutation {
    analyticSession(fullscreen: Boolean!, token: String!, coordinates: CoordinatesInput): StatusResponse!
  }
`;
