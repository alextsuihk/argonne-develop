/**
 * Resolver: Tag
 *
 */

import type { ApolloContext } from '../server';
import tagController from '../controllers/tag';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = tagController;

export default {
  Query: {
    tag: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    tags: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addTag: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addTagRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    removeTag: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updateTag: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
