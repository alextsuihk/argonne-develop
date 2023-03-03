/**
 * Resolver: School
 *
 */

import type { Ctx } from '../apollo';
import schoolController from '../controllers/school';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = schoolController;

export default {
  Query: {
    school: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    schools: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addSchool: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addSchoolRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    removeSchool: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateSchool: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
