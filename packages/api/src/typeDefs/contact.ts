/**
 * apollo typeDef: Contact
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    contact(id: ID!): Contact
    contacts: [Contact!]!
    contactToken: String!
  }

  extend type Mutation {
    addContact(token: String!): Contact!
    removeContact(id: ID!): StatusResponse!
    updateContact(id: ID!, name: String!): Contact!
  }

  type Contact {
    _id: ID!
    avatarUrl: String
    name: String!
    identifiedAt: Float
    status: String!
    tenants: [String!]!
  }
`;
