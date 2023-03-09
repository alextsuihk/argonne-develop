/**
 * Resolver: Tenant
 *
 */

import type { Ctx } from '../apollo';
import tenantController from '../controllers/tenant';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, remove, updateCore, updateExtra } = tenantController;

export default {
  Query: {
    tenants: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addTenantRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    removeTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateTenantCore: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateCore(req, args)),
    updateTenantExtra: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateExtra(req, args)),
  },
};
