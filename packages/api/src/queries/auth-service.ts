/**
 * Apollo Query: AuthService
 *
 */

import { gql } from 'apollo-server-core';

const AUTH_SERVICE_FIELDS = gql`
  fragment AuthServiceFields on AuthService {
    clientId
    token
    tokenExpireAt
    redirectUri
  }
`;

export const GET_AUTHORIZATION_TOKEN = gql`
  ${AUTH_SERVICE_FIELDS}
  query getAuthorizationToken($client: String!) {
    authorizationToken(client: $client) {
      ...AuthServiceFields
    }
  }
`;
