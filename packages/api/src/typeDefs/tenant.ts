/**
 * apollo typeDef: Tenant
 */

import gql from 'graphql-tag';

export default gql`
  extend type Query {
    tenants(query: QueryInput): [Tenant!]! @cacheControl(maxAge: 3600)
  }

  extend type Mutation {
    addTenant(tenant: TenantCoreInput!): Tenant!
    addTenantRemark(id: ID!, remark: String): Tenant!
    addTenantStash(id: ID!, title: String!, secret: String!, url: String!): Tenant!
    removeTenant(id: ID!, remark: String): StatusResponse!
    removeTenantStash(id: ID!, subId: String!): Tenant!
    sendTestEmail(email: String!): StatusResponse!
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
    authServices: [String!]!

    satelliteStatus: String

    stashes: [Stash!]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
