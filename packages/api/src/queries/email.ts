/**
 * Apollo Query: Email
 *
 */

import { gql } from 'apollo-server-core';

import { AUTH_USER_FIELDS } from './auth';
import { STATUS_RESPONSE } from './common';

export const ADD_EMAIL = gql`
  ${AUTH_USER_FIELDS}
  mutation AddEmail($email: String!) {
    addEmail(email: $email) {
      ...AuthUserFields
    }
  }
`;

export const IS_EMAIL_AVAILABLE = gql`
  query IsEmailAvailable($email: String!) {
    isEmailAvailable(email: $email)
  }
`;

export const REMOVE_EMAIL = gql`
  ${AUTH_USER_FIELDS}
  mutation RemoveEmail($email: String!) {
    removeEmail(email: $email) {
      ...AuthUserFields
    }
  }
`;

export const SEND_TEST_EMAIL = gql`
  ${STATUS_RESPONSE}
  mutation SendTestEmail($email: String!) {
    sendTestEmail(email: $email) {
      ...StatusResponse
    }
  }
`;

export const SEND_VERIFICATION_EMAIL = gql`
  ${STATUS_RESPONSE}
  mutation SendVerificationEmail($email: String!) {
    sendVerificationEmail(email: $email) {
      ...StatusResponse
    }
  }
`;

export const VERIFY_EMAIL = gql`
  ${STATUS_RESPONSE}
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      ...StatusResponse
    }
  }
`;
