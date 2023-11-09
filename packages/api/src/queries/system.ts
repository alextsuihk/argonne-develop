/**
 * Apollo Query: Subject
 *
 */

import gql from 'graphql-tag';

export const GET_SERVER_INFO = gql`
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

export const GET_SERVER_TIME = gql`
  query ServerTime {
    serverTime
  }
`;

export const PING = gql`
  query Ping {
    ping
  }
`;
