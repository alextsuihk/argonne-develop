/**
 * Resolver: Content
 *
 */

import contentController from '../controllers/content';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { find } = contentController;

export default {
  Query: {
    contents: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {},
};
