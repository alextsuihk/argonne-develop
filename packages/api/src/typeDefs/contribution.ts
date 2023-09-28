/**
 * apollo typeDef: Contribution
 *
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    contribution(id: ID!): Contribution
    contributions(query: QueryInput): [Contribution!]!
  }

  extend type Mutation {
    addContribution(book: ContributionInput!): Contribution!
    removeContribution(id: ID!, remark: String): StatusResponse!
    updateContribution(id: ID!, book: ContributionInput!): Contribution!
  }

  input ContributorInput {
    user: String!
    name: String!
    school: String!
  }

  input ContributionInput {
    title: String!
    description: String
    contributors: [ContributorInput!]!
    urls: [String!]!
  }

  type Contributor {
    user: String!
    name: String!
    school: String!
  }

  type Contribution {
    _id: ID!
    flags: [String!]!
    title: String!
    description: String

    contributors: [Contributor!]!

    urls: [String!]!
    book: String
    chapter: String

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
