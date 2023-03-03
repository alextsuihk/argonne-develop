/**
 * Resolver: Publisher
 *
 */

import type { Ctx } from '../apollo';
import publisherController from '../controllers/publisher';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = publisherController;

export default {
  Query: {
    publisher: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    publishers: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addPublisher: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addPublisherRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    removePublisher: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updatePublisher: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
