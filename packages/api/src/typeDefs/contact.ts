/**
 * apollo typeDef: Contact
 */

export default `#graphql
  extend type Query {
    contact(id: ID!): Contact
    contacts: [Contact!]!
    contactToken(expiresIn: Int): TokenWithExpireAt!
  }

  extend type Mutation {
    addContact(token: String!): Contact!
    removeContact(id: ID!): StatusResponse!
    updateContact(id: ID!, name: String!): Contact!
  }

  type Contact {
    _id: ID!
    flags: [String!]!
    avatarUrl: String
    name: String!
    identifiedAt: Float
    availability: String!
    tenants: [String!]!
    updatedAt: Float!
  }
`;
