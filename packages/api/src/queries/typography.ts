/**
 * Apollo Query: Typography
 *
 */

import { LOCALE, REMARK, STATUS_RESPONSE } from './common';

const TYPOGRAPHY_FIELDS = `#graphql
  ${LOCALE}
  ${REMARK}
  fragment TypographyFields on Typography {
    _id
    flags
    key
    title {
      ...LocaleFields
    }
    content {
      ...LocaleFields
    }

    customs {
      tenant
      title {
        ...LocaleFields
      }
      content {
        ...LocaleFields
      }
    }

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_CUSTOM_TYPOGRAPHY = `#graphql
  ${TYPOGRAPHY_FIELDS}
  mutation AddCustomTypography($id: ID!, $tenantId: String!, $custom: TypographyCustomInput!) {
    addCustomTypography(id: $id, tenantId: $tenantId, custom: $custom) {
      ...TypographyFields
    }
  }
`;

export const ADD_TYPOGRAPHY = `#graphql
  ${TYPOGRAPHY_FIELDS}
  mutation AddTypography($typography: TypographyInput!) {
    addTypography(typography: $typography) {
      ...TypographyFields
    }
  }
`;

export const ADD_TYPOGRAPHY_REMARK = `#graphql
  ${TYPOGRAPHY_FIELDS}
  mutation AddTypographyRemark($id: ID!, $remark: String!) {
    addTypographyRemark(id: $id, remark: $remark) {
      ...TypographyFields
    }
  }
`;

export const GET_TYPOGRAPHY = `#graphql
  ${TYPOGRAPHY_FIELDS}
  query GetTypography($id: ID!) {
    typography(id: $id) {
      ...TypographyFields
    }
  }
`;

export const GET_TYPOGRAPHIES = `#graphql
  ${TYPOGRAPHY_FIELDS}
  query GetTypographies($query: QueryInput) {
    typographies(query: $query) {
      ...TypographyFields
    }
  }
`;

export const REMOVE_CUSTOM_TYPOGRAPHY = `#graphql
  ${TYPOGRAPHY_FIELDS}
  mutation RemoveCustomTypography($id: ID!, $tenantId: String!) {
    removeCustomTypography(id: $id, tenantId: $tenantId) {
      ...TypographyFields
    }
  }
`;

export const REMOVE_TYPOGRAPHY = `#graphql
  ${STATUS_RESPONSE}
  mutation RemoveTypography($id: ID!, $remark: String) {
    removeTypography(id: $id, remark: $remark) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_TYPOGRAPHY = `#graphql
  ${TYPOGRAPHY_FIELDS}
  mutation UpdateTypography($id: ID!, $typography: TypographyInput!) {
    updateTypography(id: $id, typography: $typography) {
      ...TypographyFields
    }
  }
`;
