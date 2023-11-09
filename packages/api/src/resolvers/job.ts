/**
 * Resolver: Job
 *
 */

import jobController from '../controllers/job';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { find, findOne, remove } = jobController;

export default {
  Query: {
    job: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    jobs: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    removeJob: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
  },
};
