/**
 * Apollo Query: TutorRanking
 *
 */

import { gql } from 'apollo-server-core';

const TUTOR_RANKING_FIELDS = gql`
  fragment TutorRankingFields on TutorRanking {
    _id
    correctness
    explicitness
    punctuality
  }
`;

export const GET_TUTOR_RANKING = gql`
  ${TUTOR_RANKING_FIELDS}
  query GetTutorRanking($id: ID!) {
    tutorRanking(id: $id) {
      ...TutorRankingFields
    }
  }
`;

export const GET_TUTOR_RANKINGS = gql`
  ${TUTOR_RANKING_FIELDS}
  query GetTutorRankings {
    tutorRankings {
      ...TutorRankingFields
    }
  }
`;
