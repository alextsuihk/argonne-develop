/**
 * apollo typeDef: System
 */
export default `#graphql
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
