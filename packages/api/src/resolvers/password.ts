/**
 * Resolver: Password
 *
 */

import type { ApolloContext } from '../server';
import passwordController from '../controllers/password';
import { tryCatch } from './root';

type unk = unknown;

export default {
  Mutation: {
    changePassword: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => passwordController.change(req, args), true),

    resetPasswordRequest: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => passwordController.resetRequest(req, args), true),

    resetPasswordConfirm: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => passwordController.resetConfirm(req, args), true),
  },
};
