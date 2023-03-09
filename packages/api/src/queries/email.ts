/**
 * Apollo Query: Email
 *
 */

import { gql } from 'apollo-server-core';

import { STATUS_RESPONSE } from './common';
import { USER_FIELDS } from './user';

export const ADD_EMAIL = gql`
  ${USER_FIELDS}
  mutation AddEmail($email: String!) {
    addEmail(email: $email) {
      ...UserFields
    }
  }
`;

export const IS_EMAIL_AVAILABLE = gql`
  query IsEmailAvailable($email: String!) {
    isEmailAvailable(email: $email)
  }
`;

export const REMOVE_EMAIL = gql`
  ${USER_FIELDS}
  mutation RemoveEmail($email: String!) {
    removeEmail(email: $email) {
      ...UserFields
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
