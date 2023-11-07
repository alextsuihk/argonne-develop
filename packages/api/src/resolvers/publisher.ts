/**
 * Resolver: Publisher
 *
 */

import type { ApolloContext } from '../server';
import publisherController from '../controllers/publisher';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = publisherController;

export default {
  Query: {
    publisher: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    publishers: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addPublisher: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addPublisherRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    removePublisher: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updatePublisher: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
