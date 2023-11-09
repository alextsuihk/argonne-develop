/**
 * Resolver: Satellite
 *
 */

import satelliteController from '../controllers/satellite';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { createToken, setup } = satelliteController;

export default {
  Query: {
    satelliteToken: (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => createToken(req, args)),
  },

  Mutation: {
    setupSatellite: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => setup(req, args)),
  },
};
