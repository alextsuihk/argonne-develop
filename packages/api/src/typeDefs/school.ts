/**
 * apollo typeDef: School
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    school(id: ID!): School @cacheControl(maxAge: 3600)
    schools(query: QueryInput): [School!]! @cacheControl(maxAge: 3600)
  }

  extend type Mutation {
    addSchool(school: SchoolInput!): School!
    addSchoolRemark(id: ID!, remark: String!): School!
    removeSchool(id: ID!, remark: String): StatusResponse!
    updateSchool(id: ID!, school: SchoolInput!): School!
  }

  input SchoolInput {
    code: String!
    name: LocaleInput!
    address: LocaleInput
    district: String
    phones: [String!]!
    emi: Boolean
    band: String
    logoUrl: String
    website: String

    funding: String
    gender: String
    religion: String
    levels: [String!]!
  }

  type School {
    _id: ID!
    flags: [String!]!
    code: String
    name: Locale!
    address: Locale
    district: String!
    location: LocationPoint
    phones: [String!]!
    emi: Boolean
    band: String!
    logoUrl: String
    website: String
    funding: String!
    gender: String!
    religion: String!
    levels: [String!]!
    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
