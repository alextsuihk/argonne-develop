/**
 * Resolver: Subject
 *
 */

import type { Ctx } from '../apollo';
import subjectController from '../controllers/subject';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = subjectController;

export default {
  Query: {
    subject: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    subjects: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addSubject: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addSubjectRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    removeSubject: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateSubject: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
