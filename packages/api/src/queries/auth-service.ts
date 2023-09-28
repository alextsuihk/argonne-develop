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

export const AUTH_SERVICE_TOKEN = gql`
  ${AUTH_SERVICE_FIELDS}
  query AuthServiceToken($client: String!) {
    authServiceToken(client: $client) {
      ...AuthServiceFields
    }
  }
`;
