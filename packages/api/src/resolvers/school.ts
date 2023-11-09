/**
 * Resolver: School
 *
 */

import schoolController from '../controllers/school';
import type { ApolloContext } from '../server';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = schoolController;

export default {
  Query: {
    school: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    schools: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addSchool: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addSchoolRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    removeSchool: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updateSchool: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
