/**
 * Apollo Query: Tenant
 *
 */

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

export const TENANT_FIELDS = `#graphql
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
    authServices

    satelliteStatus

    stashes {
      _id
      title
      secret
      url
    }

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_TENANT = `#graphql
  ${TENANT_FIELDS}
  mutation AddTenant($tenant: TenantCoreInput!) {
    addTenant(tenant: $tenant) {
      ...TenantFields
    }
  }
`;

export const ADD_TENANT_REMARK = `#graphql
  ${TENANT_FIELDS}
  mutation AddTenantRemark($id: ID!, $remark: String!) {
    addTenantRemark(id: $id, remark: $remark) {
      ...TenantFields
    }
  }
`;

export const ADD_TENANT_STASH = `#graphql
  ${TENANT_FIELDS}
  mutation AddTenantStash($id: ID!, $title: String!, $secret: String!, $url: String!) {
    addTenantStash(id: $id, title: $title, secret: $secret, url: $url) {
      ...TenantFields
    }
  }
`;

export const GET_TENANTS = `#graphql
  ${TENANT_FIELDS}
  query GetTenants($query: QueryInput) {
    tenants(query: $query) {
      ...TenantFields
    }
  }
`;

export const REMOVE_TENANT = `#graphql
  ${STATUS_RESPONSE}
  mutation RemoveTenant($id: ID!, $remark: String) {
    removeTenant(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const REMOVE_TENANT_STASH = `#graphql
  ${TENANT_FIELDS}
  mutation RemoveTenantStash($id: ID!, $subId: String!) {
    removeTenantStash(id: $id, subId: $subId) {
      ...TenantFields
    }
  }
`;

export const SEND_TEST_EMAIL = `#graphql
  ${STATUS_RESPONSE}
  mutation SendTestEmail($email: String!) {
    sendTestEmail(email: $email) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_TENANT_CORE = `#graphql
  ${TENANT_FIELDS}
  mutation UpdateTenantCore($id: ID!, $tenant: TenantCoreInput!) {
    updateTenantCore(id: $id, tenant: $tenant) {
      ...TenantFields
    }
  }
`;

export const UPDATE_TENANT_EXTRA = `#graphql
  ${TENANT_FIELDS}
  mutation UpdateTenantExtra($id: ID!, $tenant: TenantExtraInput!) {
    updateTenantExtra(id: $id, tenant: $tenant) {
      ...TenantFields
    }
  }
`;
