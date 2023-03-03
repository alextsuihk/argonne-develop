/**
 * Resolver: Password
 *
 */

import type { Ctx } from '../apollo';
import passwordController from '../controllers/password';
import { tryCatch } from './root';

type unk = unknown;

export default {
  Mutation: {
    changePassword: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => passwordController.change(req, args), true),

    resetPasswordRequest: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => passwordController.resetRequest(req, args), true),

    resetPasswordConfirm: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => passwordController.resetConfirm(req, args), true),
  },
};
