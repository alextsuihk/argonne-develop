/**
 * apollo typeDef: Tutor-Inverse-Ranking
 */

export default `#graphql
  extend type Query {
    tutorInverseRanking(id: ID!): TutorInverseRanking
    tutorInverseRankings: [TutorInverseRanking!]!
  }

  type TutorInverseRanking {
    _id: ID!
    correctness: Int
    explicitness: Int
    punctuality: Int
  }
`;
