/**
 * Resolver: Tutor-Ranking
 *
 */

import type { Ctx } from '../apollo';
import tutorRankingController from '../controllers/tutor-ranking';
import { tryCatch } from './root';

type unk = unknown;

const { find, findOne } = tutorRankingController;

export default {
  Query: {
    tutorRanking: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    tutorRankings: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req)),
  },
};
