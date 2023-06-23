/**
 * Resolver: Classroom
 */

import type { Ctx } from '../apollo';
import classroomController from '../controllers/classroom';
import { tryCatch } from './root';

type unk = unknown;

const {
  addContent,
  addContentWithNewChat,
  addRemark,
  attach,
  blockContent,
  create,
  find,
  findOne,
  recallContent,
  recover,
  remove,
  shareHomework,
  shareQuestion,
  update,
  updateChatFlag,
  updateChatLastViewedAt,
  updateChatTitle,
  updateMembers,
} = classroomController;

export default {
  Query: {
    classroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    classrooms: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addClassroomContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addContent(req, args)),
    addClassroomContentWithNewChat: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => addContentWithNewChat(req, args)),
    addClassroomRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    attachChatGroupChatToClassroom: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => attach(req, args, 'attachChatGroup')),
    attachClassroomChatToClassroom: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => attach(req, args, 'attachClassroom')),
    blockClassroomContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => blockContent(req, args)),
    clearClassroomChatFlag: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateChatFlag(req, args, 'clearChatFlag')),
    recallClassroomContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => recallContent(req, args)),
    recoverClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => recover(req, args)),
    removeClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    setClassroomChatFlag: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateChatFlag(req, args, 'setChatFlag')),
    shareHomeworkToClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => shareHomework(req, args)),
    shareQuestionToClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => shareQuestion(req, args)),
    updateClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
    updateClassroomChatLastViewedAt: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateChatLastViewedAt(req, args)),
    updateClassroomChatTitle: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateChatTitle(req, args)),
    updateClassroomStudents: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateMembers(req, args, 'updateStudents')),
    updateClassroomTeachers: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateMembers(req, args, 'updateTeachers')),
  },
};
