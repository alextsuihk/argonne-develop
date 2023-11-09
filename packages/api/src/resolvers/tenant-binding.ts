/**
 * Resolver: TenantBinding
 *
 */

import tenantBindingController from '../controllers/tenant-binding';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { bind, createToken, unbind } = tenantBindingController;

export default {
  Query: {
    tenantToken: (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => createToken(req, args)),
  },
  Mutation: {
    bindTenant: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => bind(req, args)),
    unbindTenant: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => unbind(req, args)),
  },
};
