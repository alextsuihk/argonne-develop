/**
 * Resolver: Satellite
 *
 */

import type { Ctx } from '../apollo';
import satelliteController from '../controllers/satellite';
import { tryCatch } from './root';

type unk = unknown;

const { setup } = satelliteController;

export default {
  Query: {},

  Mutation: {
    setupSatellite: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => setup(req, args)),
  },
};
