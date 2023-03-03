/**
 * Resolver: Tag
 *
 */

import type { Ctx } from '../apollo';
import tagController from '../controllers/tag';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = tagController;

export default {
  Query: {
    tag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    tags: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addTag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addTagRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    removeTag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateTag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
