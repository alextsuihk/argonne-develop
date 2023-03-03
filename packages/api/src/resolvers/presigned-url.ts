/**
 * Resolver: Upload
 *
 */

import type { Ctx } from '../apollo';
import presignedUrlController from '../controllers/presigned-url';
import { tryCatch } from './root';

type unk = unknown;

const { create } = presignedUrlController;

export default {
  Mutation: {
    addPresignedUrl: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
  },
};
