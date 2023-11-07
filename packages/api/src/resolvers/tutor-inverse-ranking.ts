/**
 * Resolver: Tutor-Inverse-Ranking
 *
 */

import type { ApolloContext } from '../server';
import tutorInverseRankingController from '../controllers/tutor-inverse-ranking';
import { tryCatch } from './root';

type unk = unknown;

const { find, findOne } = tutorInverseRankingController;

export default {
  Query: {
    tutorInverseRanking: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    tutorInverseRankings: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req)),
  },
};
