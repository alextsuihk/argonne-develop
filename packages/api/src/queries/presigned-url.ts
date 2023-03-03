/**
 * Apollo Query: Presigned-Url
 *
 */

import { gql } from 'apollo-server-core';

const PRESIGNED_URL_FIELDS = gql`
  fragment PresignedUrlFields on PresignedUrl {
    url
    expiry
  }
`;

export const ADD_PRESIGNED_URL = gql`
  ${PRESIGNED_URL_FIELDS}
  mutation AddPresignedUrl($bucketType: String!, $ext: String!) {
    addPresignedUrl(bucketType: $bucketType, ext: $ext) {
      ...PresignedUrlFields
    }
  }
`;
