/**
 * Resolver: Subject
 *
 */

import type { ApolloContext } from '../server';
import subjectController from '../controllers/subject';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = subjectController;

export default {
  Query: {
    subject: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    subjects: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addSubject: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addSubjectRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    removeSubject: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updateSubject: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
