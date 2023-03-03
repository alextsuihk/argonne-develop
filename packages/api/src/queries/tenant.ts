/**
 * Apollo Query: Tenant
 *
 */

import { gql } from 'apollo-server-core';

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

export const TENANT_FIELDS = gql`
  ${LOCALE}
  ${REMARK}
  fragment TenantFields on Tenant {
    _id
    flags
    code
    name {
      ...LocaleFields
    }
    school
    admins
    supports
    counselors
    marshals

    theme

    services

    htmlUrl
    logoUrl
    website
    satelliteUrl

    flaggedWords

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_TENANT = gql`
  ${TENANT_FIELDS}
  mutation AddTenant($tenant: TenantCoreInput!) {
    addTenant(tenant: $tenant) {
      ...TenantFields
    }
  }
`;

export const ADD_TENANT_REMARK = gql`
  ${TENANT_FIELDS}
  mutation AddTenantRemark($id: ID!, $remark: String!) {
    addTenantRemark(id: $id, remark: $remark) {
      ...TenantFields
    }
  }
`;

export const BIND_TENANT = gql`
  ${STATUS_RESPONSE}
  mutation BindTenant($token: String!) {
    bindTenant(token: $token) {
      ...StatusResponse
    }
  }
`;

export const GET_TENANTS = gql`
  ${TENANT_FIELDS}
  query GetTenants($query: QueryInput) {
    tenants(query: $query) {
      ...TenantFields
    }
  }
`;

export const GET_TENANT_TOKEN = gql`
  query GetTenantToken($id: ID!, $expiresIn: Int) {
    tenantToken(id: $id, expiresIn: $expiresIn) {
      token
      expireAt
    }
  }
`;

export const REMOVE_TENANT = gql`
  ${STATUS_RESPONSE}
  mutation RemoveTenant($id: ID!, $remark: String) {
    removeTenant(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const SEND_TEST_EMAIL = gql`
  ${STATUS_RESPONSE}
  mutation SendTestEmail($id: ID!, $email: String!) {
    sendTestEmail(id: $id, email: $email) {
      ...StatusResponse
    }
  }
`;

export const UNBIND_TENANT = gql`
  ${STATUS_RESPONSE}
  mutation UnbindTenant($id: ID!, $userId: String!) {
    unbindTenant(id: $id, userId: $userId) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_TENANT_CORE = gql`
  ${TENANT_FIELDS}
  mutation UpdateTenantCore($id: ID!, $tenant: TenantCoreInput!) {
    updateTenantCore(id: $id, tenant: $tenant) {
      ...TenantFields
    }
  }
`;

export const UPDATE_TENANT_EXTRA = gql`
  ${TENANT_FIELDS}
  mutation UpdateTenantExtra($id: ID!, $tenant: TenantExtraInput!) {
    updateTenantExtra(id: $id, tenant: $tenant) {
      ...TenantFields
    }
  }
`;
