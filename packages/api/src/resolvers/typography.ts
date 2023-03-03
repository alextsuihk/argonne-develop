/**
 * Resolver: Typography
 *
 */

import type { Ctx } from '../apollo';
import typographyController from '../controllers/typography';
import { tryCatch } from './root';

type unk = unknown;

const { addCustom, addRemark, create, find, findOne, removeCustom, remove, update } = typographyController;

export default {
  Query: {
    typographies: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
    typography: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
  },

  Mutation: {
    addCustomTypography: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addCustom(req, args)),
    addTypographyRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    addTypography: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    removeCustomTypography: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => removeCustom(req, args)),
    removeTypography: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateTypography: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
