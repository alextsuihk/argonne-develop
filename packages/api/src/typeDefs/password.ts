/**
 * Apollo TypeDef: Password
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Mutation {
    changePassword(
      currPassword: String!
      newPassword: String!
      refreshToken: String!
      coordinates: CoordinatesInput
    ): StatusResponse!
    resetPasswordRequest(email: String!, coordinates: CoordinatesInput): StatusResponse!
    resetPasswordConfirm(token: String!, password: String!, coordinates: CoordinatesInput): StatusResponse!
  }
`;
