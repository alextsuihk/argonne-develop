/**
 * Resolver: Role
 *
 */

import type { Ctx } from '../apollo';
import roleController from '../controllers/role';
import { tryCatch } from './root';

type unk = unknown;

const { findOne, updateRole } = roleController;

export default {
  Query: {
    role: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
  },
  Mutation: {
    addRole: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateRole(req, args, 'addRole')),
    removeRole: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateRole(req, args, 'removeRole')),
  },
};
