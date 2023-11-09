/**
 * apollo typeDef: TenantBind
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    tenantToken(tenantId: String!, expiresIn: Int): TokenWithExpireAt!
  }

  extend type Mutation {
    bindTenant(bindingToken: String!, refreshToken: String!, studentId: String): StatusResponse!
    unbindTenant(tenantId: String!, userId: String!): StatusResponse!
  }
`;
