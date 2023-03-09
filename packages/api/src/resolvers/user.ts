/**
 * Resolver: User
 *
 */

import type { Ctx } from '../apollo';
import userController from '../controllers/user';
import { tryCatch } from './root';

type unk = unknown;

const { create, find, findOne, updateNetworkStatus, updateProfile, updatePaymentMethod, updateSchool, verifyId } =
  userController;

export default {
  Query: {
    users: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
    user: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
  },

  Mutation: {
    addUser: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    updateUserNetworkStatus: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateNetworkStatus(req, args)),
    // updateUserPaymentMethod: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updatePaymentMethod(req, args)),
    updateUserProfile: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateProfile(req, args)),
    updateUserSchool: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateSchool(req, args)),
    verifyId: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => verifyId(req, args)),
  },
};
