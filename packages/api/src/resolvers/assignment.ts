/**
 * Resolver: Assignment
 */

import type { Ctx } from '../apollo';
import assignmentController from '../controllers/assignment';
import { tryCatch } from './root';

type unk = unknown;

const { create, find, findOne, grade, remove, update } = assignmentController;

export default {
  Query: {
    assignment: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    assignments: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addAssignment: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    gradeAssignment: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => grade(req, args)),
    removeAssignment: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateAssignment: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
