/**
 * Apollo Query: TenantBinding
 *
 */

import { STATUS_RESPONSE } from './common';

export const BIND_TENANT = `#graphql
  ${STATUS_RESPONSE}
  mutation BindTenant($bindingToken: String!, $refreshToken: String!, $studentId: String) {
    bindTenant(bindingToken: $bindingToken, refreshToken: $refreshToken, studentId: $studentId) {
      ...StatusResponse
    }
  }
`;

export const GET_TENANT_TOKEN = `#graphql
  query GetTenantToken($tenantId: String!, $expiresIn: Int) {
    tenantToken(tenantId: $tenantId, expiresIn: $expiresIn) {
      token
      expireAt
    }
  }
`;

export const UNBIND_TENANT = `#graphql
  ${STATUS_RESPONSE}
  mutation UnbindTenant($tenantId: String!, $userId: String!) {
    unbindTenant(tenantId: $tenantId, userId: $userId) {
      ...StatusResponse
    }
  }
`;
