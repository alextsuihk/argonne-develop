/**
 * Resolver: Satellite
 *
 */

import type { Ctx } from '../apollo';
import satelliteController from '../controllers/satellite';
import { tryCatch } from './root';

type unk = unknown;

const { createToken, setup } = satelliteController;

export default {
  Query: {
    satelliteToken: (_: unk, args: unk, { req }: Ctx) => tryCatch(() => createToken(req, args)),
  },

  Mutation: {
    setupSatellite: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => setup(req, args)),
  },
};
