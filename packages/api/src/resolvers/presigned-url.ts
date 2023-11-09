/**
 * Resolver: Upload
 *
 */

import presignedUrlController from '../controllers/presigned-url';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { create } = presignedUrlController;

export default {
  Mutation: {
    addPresignedUrl: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
  },
};
