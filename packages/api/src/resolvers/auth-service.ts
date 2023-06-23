/**
 * Resolver: AuthService
 *
 */

import type { Ctx } from '../apollo';
import authServiceController from '../controllers/auth-service';
import { tryCatch } from './root';

type unk = unknown;

const { authorize } = authServiceController;

export default {
  Query: {
    authorizationToken: (_: unk, args: unk, { req }: Ctx) => tryCatch(() => authorize(req, args)),
  },
};
