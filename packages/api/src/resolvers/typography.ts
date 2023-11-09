/**
 * Resolver: Typography
 *
 */

import typographyController from '../controllers/typography';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { addCustom, addRemark, create, find, findOne, removeCustom, remove, update } = typographyController;

export default {
  Query: {
    typographies: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
    typography: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
  },

  Mutation: {
    addCustomTypography: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addCustom(req, args)),
    addTypographyRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    addTypography: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    removeCustomTypography: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => removeCustom(req, args)),
    removeTypography: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updateTypography: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
