/**
 * apollo typeDef: AuthService
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    authorizationToken(client: String!): AuthService
  }

  type AuthService {
    clientId: String!
    token: String!
    tokenExpireAt: Float!
    redirectUri: String!
  }
`;
