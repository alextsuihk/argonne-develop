/**
 * Resolver: Analytic
 *
 */

import type { Ctx } from '../apollo';
import analyticController from '../controllers/analytic';
import { tryCatch } from './root';

type unk = unknown;

const { session } = analyticController;

export default {
  Mutation: {
    analyticSession: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => session(req, args)),
  },
};
