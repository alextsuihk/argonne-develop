/**
 * Apollo Query: Tenant
 *
 */

import gql from 'graphql-tag';

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

export const ADD_TENANT_STASH = gql`
  ${TENANT_FIELDS}
  mutation AddTenantStash($id: ID!, $title: String!, $secret: String!, $url: String!) {
    addTenantStash(id: $id, title: $title, secret: $secret, url: $url) {
      ...TenantFields
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

export const REMOVE_TENANT = gql`
  ${STATUS_RESPONSE}
  mutation RemoveTenant($id: ID!, $remark: String) {
    removeTenant(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const REMOVE_TENANT_STASH = gql`
  ${TENANT_FIELDS}
  mutation RemoveTenantStash($id: ID!, $subId: String!) {
    removeTenantStash(id: $id, subId: $subId) {
      ...TenantFields
    }
  }
`;

export const SEND_TEST_EMAIL = gql`
  ${STATUS_RESPONSE}
  mutation SendTestEmail($email: String!) {
    sendTestEmail(email: $email) {
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
