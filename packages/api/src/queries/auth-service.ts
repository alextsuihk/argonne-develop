/**
 * Apollo Query: AuthService
 *
 */

const AUTH_SERVICE_FIELDS = `#graphql
  fragment AuthServiceFields on AuthService {
    clientId
    token
    tokenExpireAt
    redirectUri
  }
`;

export const AUTH_SERVICE_TOKEN = `#graphql
  ${AUTH_SERVICE_FIELDS}
  query AuthServiceToken($client: String!) {
    authServiceToken(client: $client) {
      ...AuthServiceFields
    }
  }
`;
