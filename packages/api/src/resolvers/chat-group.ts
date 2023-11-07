/**
 * Resolver: Chat-Group
 *
 */

import type { ApolloContext } from '../server';
import chatGroupController from '../controllers/chat-group';
import { tryCatch } from './root';

type unk = unknown;

const {
  addContent,
  addContentWithNewChat,
  attachChatGroup,
  blockContent,
  create,
  find,
  findOne,
  join,
  joinBook,
  leave,
  recallContent,
  shareQuestion,
  update,
  updateChatFlag,
  updateChatLastViewedAt,
  updateChatTitle,
  updateMembers,
} = chatGroupController;

export default {
  Query: {
    chatGroup: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    chatGroups: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addChatGroup: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addChatGroupContent: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addContent(req, args)),
    addChatGroupContentWithNewChat: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => addContentWithNewChat(req, args)),
    attachChatGroupChatToChatGroup: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => attachChatGroup(req, args)),
    blockChatGroupContent: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => blockContent(req, args)),
    clearChatGroupChatFlag: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateChatFlag(req, args, 'clearChatFlag')),
    joinChatGroup: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => join(req, args)),
    joinBookChatGroup: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => joinBook(req, args)),
    leaveChatGroup: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => leave(req, args)),
    recallChatGroupContent: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => recallContent(req, args)),
    setChatGroupChatFlag: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateChatFlag(req, args, 'setChatFlag')),
    shareQuestionToChatGroup: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => shareQuestion(req, args)),
    updateChatGroup: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
    updateChatGroupAdmins: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateMembers(req, args, 'updateAdmins')),
    updateChatGroupChatLastViewedAt: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateChatLastViewedAt(req, args)),
    updateChatGroupChatTitle: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateChatTitle(req, args)),
    updateChatGroupUsers: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => updateMembers(req, args, 'updateUsers')),

    toAdminChatGroup: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args, 'toAdmin')),
    toAlexChatGroup: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args, 'toAlex')),

    toTenantAdminsChatGroup: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => create(req, args, 'toTenantAdmins')),
    toTenantCounselorsChatGroup: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => create(req, args, 'toTenantCounselors')),
    toTenantSupportsChatGroup: async (_: unk, args: unk, { req }: ApolloContext) =>
      tryCatch(() => create(req, args, 'toTenantSupports')),
  },
};
