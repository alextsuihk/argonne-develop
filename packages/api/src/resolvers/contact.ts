/**
 * Resolver: Contact
 *
 */

import type { Ctx } from '../apollo';
import contactController from '../controllers/contact';
import { tryCatch } from './root';

type unk = unknown;

const { find, findOne, create, createToken, update, remove } = contactController;

export default {
  Query: {
    contact: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    contacts: async (_: unk, __: unk, { req }: Ctx) => tryCatch(() => find(req)),
    contactToken: (_: unk, args: unk, { req }: Ctx) => tryCatch(() => createToken(req, args)),
  },
  Mutation: {
    addContact: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    removeContact: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateContact: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
