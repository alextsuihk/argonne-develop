/**
 * Apollo Query: TutorInverseRanking
 *
 */

const TUTOR_INVERSE_RANKING_FIELDS = `#graphql
  fragment TutorInverseRankingFields on TutorInverseRanking {
    _id
    correctness
    explicitness
    punctuality
  }
`;

export const GET_TUTOR_INVERSE_RANKING = `#graphql
  ${TUTOR_INVERSE_RANKING_FIELDS}
  query GetTutorInverseRanking($id: ID!) {
    tutorInverseRanking(id: $id) {
      ...TutorInverseRankingFields
    }
  }
`;

export const GET_TUTOR_INVERSE_RANKINGS = `#graphql
  ${TUTOR_INVERSE_RANKING_FIELDS}
  query GetTutorInverseRankings {
    tutorInverseRankings {
      ...TutorInverseRankingFields
    }
  }
`;
