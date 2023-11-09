/**
 * Resolver: Contact
 *
 */

import contactController from '../controllers/contact';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { find, findOne, create, createToken, update, remove } = contactController;

export default {
  Query: {
    contact: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    contacts: async (_: unk, __: unk, { req }: ApolloContext) => tryCatch(() => find(req)),
    contactToken: (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => createToken(req, args)),
  },
  Mutation: {
    addContact: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    removeContact: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updateContact: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
