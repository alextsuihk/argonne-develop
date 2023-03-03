/**
 * Resolver: Tenant
 *
 */

import type { Ctx } from '../apollo';
import tenantController from '../controllers/tenant';
import { tryCatch } from './root';

type unk = unknown;

const {
  addRemark,
  create,
  find,
  remove,
  sendTestEmail,
  tenantBind,
  tenantToken,
  tenantUnbind,
  updateCore,
  updateExtra,
} = tenantController;

export default {
  Query: {
    tenants: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
    tenantToken: (_: unk, args: unk, { req }: Ctx) => tryCatch(() => tenantToken(req, args)),
  },
  Mutation: {
    addTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addTenantRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    bindTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => tenantBind(req, args)),
    removeTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    sendTestEmail: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => sendTestEmail(req, args)),
    unbindTenant: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => tenantUnbind(req, args)),
    updateTenantCore: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateCore(req, args)),
    updateTenantExtra: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateExtra(req, args)),
  },
};
