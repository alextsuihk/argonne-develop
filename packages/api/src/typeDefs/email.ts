/**
 * Apollo TypeDef: Email
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    isEmailAvailable(email: String!): Boolean
  }

  extend type Mutation {
    addEmail(email: String!): User!
    removeEmail(email: String!): User!
    sendTestEmail(email: String!): StatusResponse!
    sendVerificationEmail(email: String!): StatusResponse!
    verifyEmail(token: String!): StatusResponse!
  }
`;
