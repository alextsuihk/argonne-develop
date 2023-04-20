/**
 * apollo typeDef: TenantBing
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    tenantToken(tenantId: String!, expiresIn: Int): TokenWithExpireAt!
  }

  extend type Mutation {
    bindTenant(token: String!): User!
    unbindTenant(tenantId: String!, userId: String!): StatusResponse!
  }
`;
