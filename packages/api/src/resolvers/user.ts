/**
 * Resolver: User
 *
 */

import type { Ctx } from '../apollo';
import userController from '../controllers/user';
import { tryCatch } from './root';

type unk = unknown;

const {
  create,
  isEmailAvailable,
  find,
  findOne,
  tenantToken,
  updateEmail,
  updateNetworkStatus,
  updateProfile,
  updatePaymentMethod,
  updateSchool,
  verifyEmail,
  verifyId,
} = userController;

export default {
  Query: {
    isEmailAvailable: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => isEmailAvailable(req, args)),
    tenantToken: (_: unk, args: unk, { req }: Ctx) => tryCatch(() => tenantToken(req, args)),
    users: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
    user: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
  },

  Mutation: {
    addUser: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateEmail(req, args, 'addEmail')),
    // bindTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => tenantBind(req, args)),
    removeEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateEmail(req, args, 'removeEmail')),
    // unbindTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => tenantUnbind(req, args)),
    updateUserNetworkStatus: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateNetworkStatus(req, args)),
    // updateUserPaymentMethod: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updatePaymentMethod(req, args)),
    updateUserProfile: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateProfile(req, args)),
    updateUserSchool: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateSchool(req, args)),
    verifyEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => verifyEmail(req, args)),
    verifyId: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => verifyId(req, args)),
  },
};
