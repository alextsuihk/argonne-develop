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
    addTutorCredential(title: String!, proofs: [String!]!): Tutor!
    addTutorRemark(id: ID!, remark: String!): Tutor!
    addTutorSpecialty(tenantId: String!, note: String, langs: [String!]!, level: String!, subject: String!): Tutor!
    removeTutorCredential(subId: String!): Tutor!
    removeTutorSpecialty(subId: String!): Tutor!
    updateTutor(intro: String, officeHour: String): Tutor!
    verifyTutorCredential(id: ID!, subId: String!): Tutor!
  }

  type Credential {
    _id: String!
    title: String!
    proofs: [String!]!
    updatedAt: Float!
    verifiedAt: Float
  }

  type Ranking {
    level: String!
    subject: String!
    correctness: Int
    explicitness: Int
    punctuality: Int
  }

  type Specialty {
    _id: String!
    tenant: String!
    note: String
    langs: [String!]!
    level: String!
    subject: String!
  }

  type Tutor {
    _id: String!
    flags: [String!]
    name: String # undefined in case userDoc is deleted
    intro: String
    officeHour: String
    credentials: [Credential!]!
    specialties: [Specialty!]!
    rankings: [Ranking!]!
    rankingsUpdatedAt: Float

    star: Int

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
