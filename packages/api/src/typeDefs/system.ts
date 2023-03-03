import { gql } from 'apollo-server-express';

export default gql`
  type ServerInfo {
    mode: String!
    primaryTenantId: String
    status: String!
    minio: String!
    timestamp: Float!
    version: String!
    hubVersion: String
    hash: String!
    builtAt: String! # builtAt is read from a JSON file (as string)
  }

  extend type Query {
    serverInfo: ServerInfo!
    ping: String!
    time: Float!
  }
`;
