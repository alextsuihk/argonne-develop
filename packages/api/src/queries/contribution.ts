/**
 * Apollo Query: Book
 *
 */

import { REMARK, STATUS_RESPONSE } from './common';

export const CONTRIBUTION_FIELDS = `#graphql
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
