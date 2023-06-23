/**
 * Resolver: Content
 *
 */

import type { Ctx } from '../apollo';
import contentController from '../controllers/content';
import { tryCatch } from './root';

type unk = unknown;

const { find } = contentController;

export default {
  Query: {
    contents: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {},
};
