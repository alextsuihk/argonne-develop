/**
 * apollo typeDef: Tutor-Inverse-Ranking
 */

import { gql } from 'apollo-server-express';

export default gql`
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
