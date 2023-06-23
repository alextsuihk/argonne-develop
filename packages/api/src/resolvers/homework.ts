/**
 * Resolver: Homework
 */

import type { Ctx } from '../apollo';
import homeworkController from '../controllers/homework';
import { tryCatch } from './root';

type unk = unknown;

const { find, findOne, recallContent, update } = homeworkController;

export default {
  Query: {
    homework: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    homeworks: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    recallHomeworkContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => recallContent(req, args)),
    updateHomework: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
