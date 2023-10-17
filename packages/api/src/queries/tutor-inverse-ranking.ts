/**
 * Apollo Query: TutorInverseRanking
 *
 */

import { gql } from 'apollo-server-core';

const TUTOR_INVERSE_RANKING_FIELDS = gql`
  fragment TutorInverseRankingFields on TutorInverseRanking {
    _id
    correctness
    explicitness
    punctuality
  }
`;

export const GET_TUTOR_INVERSE_RANKING = gql`
  ${TUTOR_INVERSE_RANKING_FIELDS}
  query GetTutorInverseRanking($id: ID!) {
    tutorInverseRanking(id: $id) {
      ...TutorInverseRankingFields
    }
  }
`;

export const GET_TUTOR_INVERSE_RANKINGS = gql`
  ${TUTOR_INVERSE_RANKING_FIELDS}
  query GetTutorInverseRankings {
    tutorInverseRankings {
      ...TutorInverseRankingFields
    }
  }
`;
