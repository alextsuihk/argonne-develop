/**
 * Resolver: Chat-Group
 *
 */

import type { Ctx } from '../apollo';
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
    chatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    chatGroups: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addChatGroupContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addContent(req, args)),
    addChatGroupContentWithNewChat: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => addContentWithNewChat(req, args)),
    attachChatGroupChatToChatGroup: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => attachChatGroup(req, args)),
    blockChatGroupContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => blockContent(req, args)),
    clearChatGroupChatFlag: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateChatFlag(req, args, 'clearChatFlag')),
    joinChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => join(req, args)),
    joinBookChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => joinBook(req, args)),
    leaveChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => leave(req, args)),
    recallChatGroupContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => recallContent(req, args)),
    setChatGroupChatFlag: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateChatFlag(req, args, 'setChatFlag')),
    shareQuestionToChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => shareQuestion(req, args)),
    updateChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
    updateChatGroupAdmins: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateMembers(req, args, 'updateAdmins')),
    updateChatGroupChatLastViewedAt: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateChatLastViewedAt(req, args)),
    updateChatGroupChatTitle: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateChatTitle(req, args)),
    updateChatGroupUsers: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => updateMembers(req, args, 'updateUsers')),

    toAdminChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args, 'toAdmin')),
    toAlexChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args, 'toAlex')),

    toTenantAdminsChatGroup: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => create(req, args, 'toTenantAdmins')),
    toTenantCounselorsChatGroup: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => create(req, args, 'toTenantCounselors')),
    toTenantSupportsChatGroup: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => create(req, args, 'toTenantSupports')),
  },
};
