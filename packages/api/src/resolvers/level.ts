/**
 * Resolver: Level
 *
 */

import type { Ctx } from '../apollo';
import levelController from '../controllers/level';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = levelController;

export default {
  Query: {
    level: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    levels: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addLevel: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addLevelRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    removeLevel: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateLevel: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
