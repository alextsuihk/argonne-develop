/**
 * Resolver: TenantBinding
 *
 */

import type { Ctx } from '../apollo';
import tenantBindingController from '../controllers/tenant-binding';
import { tryCatch } from './root';

type unk = unknown;

const { bind, createToken, unbind } = tenantBindingController;

export default {
  Query: {
    tenantToken: (_: unk, args: unk, { req }: Ctx) => tryCatch(() => createToken(req, args)),
  },
  Mutation: {
    bindTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => bind(req, args)),
    unbindTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => unbind(req, args)),
  },
};
