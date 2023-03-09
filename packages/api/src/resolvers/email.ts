/**
 * Resolver: Email
 *
 */

import type { Ctx } from '../apollo';
import emailController from '../controllers/emails';
import { tryCatch } from './root';

type unk = unknown;

const { isAvailable, sendTest, sendVerification, update, verify } = emailController;

export default {
  Query: {
    isEmailAvailable: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => isAvailable(req, args)),
  },

  Mutation: {
    addEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args, 'add')),
    removeEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args, 'remove')),
    sendTestEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => sendTest(req, args)),
    sendVerificationEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => sendVerification(req, args)),
    verifyEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => verify(req, args)),
  },
};
