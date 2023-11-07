/**
 * Apollo Query: Presigned-Url
 *
 */

const PRESIGNED_URL_FIELDS = `#graphql
  fragment PresignedUrlFields on PresignedUrl {
    url
    expiry
  }
`;

export const ADD_PRESIGNED_URL = `#graphql
  ${PRESIGNED_URL_FIELDS}
  mutation AddPresignedUrl($bucketType: String!, $ext: String!) {
    addPresignedUrl(bucketType: $bucketType, ext: $ext) {
      ...PresignedUrlFields
    }
  }
`;
