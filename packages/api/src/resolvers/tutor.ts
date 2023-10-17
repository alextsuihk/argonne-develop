/**
 * Resolver: Tutor
 *
 */

import type { Ctx } from '../apollo';
import tutorController from '../controllers/tutor';
import { tryCatch } from './root';

type unk = unknown;

const { find, findOne, upsert } = tutorController;

export default {
  Query: {
    tutor: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    tutors: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addTutorCredential: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => upsert(req, args, 'addCredential')),
    addTutorRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => upsert(req, args, 'addRemark')),
    addTutorSpecialty: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => upsert(req, args, 'addSpecialty')),
    removeTutorCredential: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => upsert(req, args, 'removeCredential')),
    removeTutorSpecialty: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => upsert(req, args, 'removeSpecialty')),
    updateTutor: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => upsert(req, args)),
    verifyTutorCredential: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => upsert(req, args, 'verifyCredential')),
  },
};
