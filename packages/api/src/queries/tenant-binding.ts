/**
 * Apollo Query: TenantBinding
 *
 */

import gql from 'graphql-tag';

import { STATUS_RESPONSE } from './common';

export const BIND_TENANT = gql`
  ${STATUS_RESPONSE}
  mutation BindTenant($bindingToken: String!, $refreshToken: String!, $studentId: String) {
    bindTenant(bindingToken: $bindingToken, refreshToken: $refreshToken, studentId: $studentId) {
      ...StatusResponse
    }
  }
`;

export const GET_TENANT_TOKEN = gql`
  query GetTenantToken($tenantId: String!, $expiresIn: Int) {
    tenantToken(tenantId: $tenantId, expiresIn: $expiresIn) {
      token
      expireAt
    }
  }
`;

export const UNBIND_TENANT = gql`
  ${STATUS_RESPONSE}
  mutation UnbindTenant($tenantId: String!, $userId: String!) {
    unbindTenant(tenantId: $tenantId, userId: $userId) {
      ...StatusResponse
    }
  }
`;
