/**
 * Resolver: Level
 *
 */

import levelController from '../controllers/level';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = levelController;

export default {
  Query: {
    level: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    levels: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addLevel: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addLevelRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    removeLevel: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updateLevel: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
