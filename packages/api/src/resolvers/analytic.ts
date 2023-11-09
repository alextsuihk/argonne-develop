/**
 * Resolver: Analytic
 *
 */

import analyticController from '../controllers/analytic';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { session } = analyticController;

export default {
  Mutation: {
    analyticSession: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => session(req, args)),
  },
};
