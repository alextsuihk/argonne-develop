/**
 * Apollo Query: Subject
 *
 */

export const GET_SERVER_INFO = `#graphql
  query GetServerInfo {
    serverInfo {
      mode
      primaryTenantId
      status
      minio
      timestamp
      version
      hubVersion
      hash
      builtAt
    }
  }
`;

export const GET_SERVER_TIME = `#graphql
  query ServerTime {
    serverTime
  }
`;

export const PING = `#graphql
  query Ping {
    ping
  }
`;
