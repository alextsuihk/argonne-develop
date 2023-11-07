/**
 * Resolver: Homework
 */

import type { ApolloContext } from '../server';
import homeworkController from '../controllers/homework';
import { tryCatch } from './root';

type unk = unknown;

const { find, findOne, recallContent, update } = homeworkController;

export default {
  Query: {
    homework: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    homeworks: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    recallHomeworkContent: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => recallContent(req, args)),
    updateHomework: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
