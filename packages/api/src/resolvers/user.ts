/**
 * Resolver: UserAdmin
 *
 */

import type { Ctx } from '../apollo';
import userController from '../controllers/user';
import { tryCatch } from './root';

type unk = unknown;

const { changePassword, create, find, findOne, update } = userController;

export default {
  Query: {
    users: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
    user: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
  },

  Mutation: {
    addUser: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addUserFeature: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args, 'addFeature')),
    addUserRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args, 'addRemark')),
    addUserSchoolHistory: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => update(req, args, 'addSchoolHistory')),
    changeUserPassword: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => changePassword(req, args)),
    clearUserFlag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args, 'clearFlag')),
    removeUserFeature: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args, 'removeFeature')),
    setUserFlag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args, 'setFlag')),
    suspendUser: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args, 'suspend')),
    updateUserIdentifiedAt: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => update(req, args, 'updateIdentifiedAt')),
  },
};
