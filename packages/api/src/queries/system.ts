/**
 * Apollo Query: Subject
 *
 */

import { gql } from 'apollo-server-core';

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

export const PING = gql`
  query Ping {
    ping
  }
`;
