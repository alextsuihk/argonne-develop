/**
 * apollo typeDef: Analytic
 */

export default `#graphql
  extend type Mutation {
    analyticSession(fullscreen: Boolean!, token: String!, coordinates: CoordinatesInput): StatusResponse!
  }
`;
