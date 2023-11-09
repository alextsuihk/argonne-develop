/**
 * Resolver: Role
 *
 */

import roleController from '../controllers/role';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { findOne, updateRole } = roleController;

export default {
  Query: {
    role: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
  },
  Mutation: {
    addRole: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => updateRole(req, args, 'addRole')),
    removeRole: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateRole(req, args, 'removeRole')),
  },
};
