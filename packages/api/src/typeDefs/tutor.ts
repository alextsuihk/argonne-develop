/**
 * apollo typeDef: Tutor
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    tutor(id: ID!): Tutor
    tutors(query: QueryInput): [Tutor!]!
  }

  extend type Mutation {
    addTutor(tenantId: String!, userId: String!): Tutor!
    addTutorCredential(id: ID!, title: String!, proofs: [String!]!): Tutor!
    addTutorRemark(id: ID!, remark: String!): Tutor!
    addTutorSpecialty(id: ID!, note: String, lang: String!, level: String!, subject: String!): Tutor!
    removeTutor(id: ID!, remark: String): StatusResponse!
    removeTutorCredential(id: ID!, credentialId: String!): Tutor!
    removeTutorSpecialty(id: ID!, specialtyId: String!): Tutor!
    updateTutor(id: ID!, intro: String!, officeHour: String): Tutor!
    verifyTutorCredential(id: ID!, credentialId: String!): Tutor!
  }

  type Credential {
    _id: String!
    title: String!
    proofs: [String!]
    updatedAt: Float!
    verifiedAt: Float
  }

  type SpecialtyRanking {
    correctness: Int!
    punctuality: Int!
    explicitness: Int!
  }

  type Specialty {
    _id: String!
    note: String
    lang: String!
    level: String!
    subject: String!
    ranking: SpecialtyRanking!
  }

  type Tutor {
    _id: String!
    flags: [String!]!
    tenant: String!
    user: String!
    intro: String
    officeHour: String
    credentials: [Credential!]!
    specialties: [Specialty!]!
    rankingUpdatedAt: Float!
    star: Int

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
