/**
 * Apollo Query: Book
 *
 */

import { gql } from 'apollo-server-core';

import { REMARK, STATUS_RESPONSE } from './common';

export const CONTRIBUTION_FIELDS = gql`
  ${REMARK}
  fragment ContributionFields on Contribution {
    _id
    flags

    title
    description
    contributors {
      user
      name
      school
    }
    urls
    book
    chapter

    remarks {
      ...RemarkFields
    }
    createdAt
    updatedAt
    deletedAt
  }
`;
