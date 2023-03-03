/**
 * Resolver: Tutor
 *
 */

import type { Ctx } from '../apollo';
import tutorController from '../controllers/tutor';
import { tryCatch } from './root';

type unk = unknown;

const {
  addRemark,
  create,
  find,
  findOne,
  addCredential,
  addSpecialty,
  remove,
  removeCredential,
  removeSpecialty,
  verifyCredential,
  update,
} = tutorController;

export default {
  Query: {
    tutor: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    tutors: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addTutor: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addTutorCredential: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addCredential(req, args)),
    addTutorRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    removeTutor: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    addTutorSpecialty: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addSpecialty(req, args)),
    removeTutorCredential: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => removeCredential(req, args)),
    removeTutorSpecialty: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => removeSpecialty(req, args)),
    updateTutor: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
    verifyTutorCredential: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => verifyCredential(req, args)),
  },
};
