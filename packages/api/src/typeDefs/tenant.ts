/**
 * apollo typeDef: Tenant
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    tenants(query: QueryInput): [Tenant!]! @cacheControl(maxAge: 3600)
    tenantToken(id: ID!, expiresIn: Int): TenantToken!
  }

  extend type Mutation {
    addTenant(tenant: TenantCoreInput!): Tenant!
    addTenantRemark(id: ID!, remark: String): Tenant!
    bindTenant(token: String!): StatusResponse!
    removeTenant(id: ID!, remark: String): StatusResponse!
    sendTestEmail(id: ID!, email: String!): StatusResponse!
    unbindTenant(id: ID!, userId: String!): StatusResponse!
    updateTenantCore(id: ID!, tenant: TenantCoreInput!): Tenant!
    updateTenantExtra(id: ID!, tenant: TenantExtraInput!): Tenant!
  }

  input TenantCoreInput {
    code: String!
    name: LocaleInput!
    school: String
    services: [String!]!
    satelliteUrl: String
  }

  input TenantExtraInput {
    admins: [String!]!
    supports: [String!]!
    counselors: [String!]!
    marshals: [String!]!
    theme: String
    htmlUrl: String
    logoUrl: String
    website: String
    flaggedWords: [String]!
  }

  type TenantHomePage {
    slogan: Locale
    contact: String
    htmlTexts: [[Locale]]
  }

  type Tenant {
    _id: ID!
    flags: [String!]!
    code: String!
    name: Locale!
    school: String
    admins: [String!]!
    supports: [String!]!
    counselors: [String!]!
    marshals: [String!]!

    theme: String

    services: [String!]!

    htmlUrl: String
    logoUrl: String
    website: String
    satelliteUrl: String

    flaggedWords: [String!]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }

  type TenantToken {
    token: String!
    expireAt: Float!
  }
`;
