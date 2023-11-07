/**
 * Resolver: Tenant
 *
 */

import type { ApolloContext } from '../server';
import tenantController from '../controllers/tenant';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, addStash, create, find, remove, removeStash, sendTestEmail, updateCore, updateExtra } =
  tenantController;

export default {
  Query: {
    tenants: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addTenant: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addTenantRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    addTenantStash: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addStash(req, args)),
    removeTenant: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    removeTenantStash: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => removeStash(req, args)),
    sendTestEmail: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => sendTestEmail(req, args)),
    updateTenantCore: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => updateCore(req, args)),
    updateTenantExtra: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => updateExtra(req, args)),
  },
};
