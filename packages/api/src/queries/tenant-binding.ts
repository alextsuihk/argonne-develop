/**
 * Apollo Query: TenantBinding
 *
 */

import { gql } from 'apollo-server-core';

import { STATUS_RESPONSE } from './common';
import { USER_FIELDS } from './user';

export const BIND_TENANT = gql`
  ${USER_FIELDS}
  mutation BindTenant($token: String!) {
    bindTenant(token: $token) {
      ...UserFields
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
