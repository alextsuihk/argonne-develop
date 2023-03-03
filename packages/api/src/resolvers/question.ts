/**
 * Resolver: Question
 */

import type { Ctx } from '../apollo';
import questionController from '../controllers/question';
import { tryCatch } from './root';

type unk = unknown;

const { bid, create, find, findOne, remove, update } = questionController;

export default {
  Query: {
    question: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    questions: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addQuestion: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    bidQuestion: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => bid(req, args)),

    removeQuestion: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateQuestion: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
