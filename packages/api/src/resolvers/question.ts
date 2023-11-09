/**
 * Resolver: Question
 */

import questionController from '../controllers/question';
import type { ApolloContext } from '../server';
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
  updateRanking,
} = questionController;

export default {
  Query: {
    question: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    questions: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addQuestion: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addQuestionBidContent: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => addBidContent(req, args)),
    addQuestionBidders: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addBidders(req, args)),
    addQuestionContent: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addContent(req, args)),
    assignQuestionTutor: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => assignTutor(req, args)),
    clearQuestionFlag: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateFlag(req, args, 'clearFlag')),
    closeQuestion: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => close(req, args)),
    cloneQuestion: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => clone(req, args)),
    removeQuestion: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    setQuestionFlag: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateFlag(req, args, 'setFlag')),
    updateQuestionLastViewedAt: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateLastViewedAt(req, args)),
    updateQuestionRanking: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateRanking(req, args)),
  },
};
