/**
 * apollo typeDef: District
 */

export default `#graphql
  extend type Query {
    district(id: ID!): District @cacheControl(maxAge: 3600)
    districts(query: QueryInput): [District!]! @cacheControl(maxAge: 3600)
  }

  extend type Mutation {
    addDistrict(district: DistrictInput!): District!
    addDistrictRemark(id: ID!, remark: String!): District!
    removeDistrict(id: ID!, remark: String): StatusResponse!
    updateDistrict(id: ID!, district: DistrictInput!): District!
  }

  input DistrictInput {
    name: LocaleInput!
    region: LocaleInput!
  }

  type District {
    _id: ID!
    flags: [String!]!
    name: Locale!
    region: Locale!
    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
