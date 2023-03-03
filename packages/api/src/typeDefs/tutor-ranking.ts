/**
 * apollo typeDef: Tutor-Ranking
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    tutorRanking(id: ID!): TutorRanking
    tutorRankings: [TutorRanking!]!
  }

  type TutorRanking {
    _id: ID!
    correctness: Int!
    explicitness: Int!
    punctuality: Int!
  }
`;
