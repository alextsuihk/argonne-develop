/**
 * Resolver: Assignment
 */

import assignmentController from '../controllers/assignment';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { create, find, findOne, grade, remove, update } = assignmentController;

export default {
  Query: {
    assignment: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    assignments: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addAssignment: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    gradeAssignment: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => grade(req, args)),
    removeAssignment: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updateAssignment: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
