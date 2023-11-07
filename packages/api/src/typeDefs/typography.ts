/**
 * apollo typeDef: Typography
 */

export default `#graphql
  extend type Query {
    typography(id: ID!): Typography @cacheControl(maxAge: 3600)
    typographies(query: QueryInput): [Typography!]! @cacheControl(maxAge: 3600)
  }

  extend type Mutation {
    addCustomTypography(id: ID!, tenantId: String!, custom: TypographyCustomInput!): Typography!
    addTypography(typography: TypographyInput!): Typography!
    addTypographyRemark(id: ID!, remark: String!): Typography!

    removeCustomTypography(id: ID!, tenantId: String!): Typography!
    removeTypography(id: ID!, remark: String): StatusResponse!
    updateTypography(id: ID!, typography: TypographyInput!): Typography!
  }

  input TypographyInput {
    key: String!
    title: LocaleInput!
    content: LocaleInput!
  }

  input TypographyCustomInput {
    title: LocaleInput!
    content: LocaleInput!
  }

  type TypographyCustom {
    tenant: String!
    title: Locale!
    content: Locale!
  }

  type Typography {
    _id: ID!
    flags: [String!]!
    key: String!
    title: Locale!
    content: Locale!
    customs: [TypographyCustom!]
    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
