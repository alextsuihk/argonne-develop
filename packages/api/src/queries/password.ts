/**
 * Apollo Query: Password
 *
 */

import { gql } from 'apollo-server-core';

import { STATUS_RESPONSE } from './common';

export const CHANGE_PASSWORD = gql`
  ${STATUS_RESPONSE}
  mutation ChangePassword(
    $currPassword: String!
    $newPassword: String!
    $refreshToken: String!
    $coordinates: CoordinatesInput
  ) {
    changePassword(
      currPassword: $currPassword
      newPassword: $newPassword
      refreshToken: $refreshToken
      coordinates: $coordinates
    ) {
      ...StatusResponse
    }
  }
`;

export const RESET_PASSWORD_REQUEST = gql`
  ${STATUS_RESPONSE}
  mutation ResetPasswordRequest($email: String!, $coordinates: CoordinatesInput) {
    resetPasswordRequest(email: $email, coordinates: $coordinates) {
      ...StatusResponse
    }
  }
`;

export const RESET_PASSWORD_CONFIRM = gql`
  ${STATUS_RESPONSE}
  mutation ResetPasswordConfirm($token: String!, $password: String!, $coordinates: CoordinatesInput) {
    resetPasswordConfirm(token: $token, password: $password, coordinates: $coordinates) {
      ...StatusResponse
    }
  }
`;
