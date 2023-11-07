/**
 * Resolver: Analytic
 *
 */

import type { ApolloContext } from '../server';
import analyticController from '../controllers/analytic';
import { tryCatch } from './root';

type unk = unknown;

const { session } = analyticController;

export default {
  Mutation: {
    analyticSession: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => session(req, args)),
  },
};
