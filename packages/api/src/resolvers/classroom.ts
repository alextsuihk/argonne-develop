/**
 * Resolver: Classroom
 */

import type { Ctx } from '../apollo';
import classroomController from '../controllers/classroom';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, recover, remove, update, updateMembers } = classroomController;

export default {
  Query: {
    classroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    classrooms: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addClassroomRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    addClassroomStudents: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateMembers(req, args, 'addStudents')),
    addClassroomTeachers: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateMembers(req, args, 'addTeachers')),
    recoverClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => recover(req, args)),
    removeClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    removeClassroomStudents: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateMembers(req, args, 'removeStudents')),
    removeClassroomTeachers: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateMembers(req, args, 'removeTeachers')),
    updateClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
