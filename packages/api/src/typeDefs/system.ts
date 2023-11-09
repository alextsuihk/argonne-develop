/**
 * apollo typeDef: System
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    serverInfo: ServerInfo!
    serverTime: Float!
    ping: String!
  }

  type ServerInfo {
    mode: String!
    primaryTenantId: String
    status: String
    minio: String!
    timestamp: Float!
    version: String!
    hubVersion: String
    hash: String!
    builtAt: String! # builtAt is read from a JSON file (as string)
  }
`;
