/**
 * Resolver: Classroom
 */

import type { ApolloContext } from '../server';
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
    classroom: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    classrooms: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addClassroom: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addClassroomContent: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addContent(req, args)),
    addClassroomContentWithNewChat: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => addContentWithNewChat(req, args)),
    addClassroomRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    attachChatGroupChatToClassroom: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => attach(req, args, 'attachChatGroup')),
    attachClassroomChatToClassroom: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => attach(req, args, 'attachClassroom')),
    blockClassroomContent: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => blockContent(req, args)),
    clearClassroomChatFlag: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateChatFlag(req, args, 'clearChatFlag')),
    recallClassroomContent: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => recallContent(req, args)),
    recoverClassroom: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => recover(req, args)),
    removeClassroom: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    setClassroomChatFlag: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateChatFlag(req, args, 'setChatFlag')),
    shareHomeworkToClassroom: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => shareHomework(req, args)),
    shareQuestionToClassroom: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => shareQuestion(req, args)),
    updateClassroom: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
    updateClassroomChatLastViewedAt: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateChatLastViewedAt(req, args)),
    updateClassroomChatTitle: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateChatTitle(req, args)),
    updateClassroomStudents: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateMembers(req, args, 'updateStudents')),
    updateClassroomTeachers: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateMembers(req, args, 'updateTeachers')),
  },
};
