/**
 * Resolver: User
 *
 */

import type { Ctx } from '../apollo';
import userController from '../controllers/user';
import { tryCatch } from './root';

type unk = unknown;

const {
  addSchoolHistory,
  changePassword,
  create,
  find,
  findOne,
  suspend,
  updateFeature,
  updateFlag,
  updateIdentifiedAt,
} = userController;

export default {
  Query: {
    users: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
    user: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
  },

  Mutation: {
    addUser: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addUserFeature: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateFeature(req, args, 'addFeature')),
    addUserSchoolHistory: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addSchoolHistory(req, args)),
    changeUserPassword: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => changePassword(req, args)),
    clearUserFlag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateFlag(req, args, 'clearFlag')),
    removeUserFeature: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateFeature(req, args, 'removeFeature')),
    setUserFlag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateFlag(req, args, 'setFlag')),
    suspendUser: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => suspend(req, args)),
    updateIdentifiedAt: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateIdentifiedAt(req, args)),
  },
};
