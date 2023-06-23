/**
 * Resolver: Question
 */

import type { Ctx } from '../apollo';
import questionController from '../controllers/question';
import { tryCatch } from './root';

type unk = unknown;

const {
  addBidContent,
  addBidders,
  addContent,
  assignTutor,
  close,
  clone,
  create,
  find,
  findOne,
  remove,
  updateFlag,
  updateLastViewedAt,
} = questionController;

export default {
  Query: {
    question: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    questions: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addQuestion: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addQuestionBidContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addBidContent(req, args)),
    addQuestionBidders: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addBidders(req, args)),
    addQuestionContentByStudent: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => addContent(req, args, 'addContentByStudent')),
    addQuestionContentByTutor: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => addContent(req, args, 'addContentByTutor')),
    addQuestionContentWithDispute: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => addContent(req, args, 'dispute')),
    assignQuestionTutor: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => assignTutor(req, args)),
    clearQuestionFlag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateFlag(req, args, 'clearFlag')),
    closeQuestion: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => close(req, args)),
    cloneQuestion: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => clone(req, args)),
    removeQuestion: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    setQuestionFlag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateFlag(req, args, 'setFlag')),
    updateQuestionLastViewedAt: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateLastViewedAt(req, args)),
  },
};
