/**
 * Resolver: Chat
 *
 */

import type { Ctx } from '../apollo';
import chatController from '../controllers/chat';
import { tryCatch } from './root';

type unk = unknown;

const {
  attachToClassroom,
  blockContent,
  create,
  find,
  findOne,
  recallContent,
  updateTitle,
  updateLastViewedAt,
  updateFlag,
} = chatController;

export default {
  Query: {
    chat: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    chats: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addChat: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    attachChatToClassroom: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => attachToClassroom(req, args)),
    blockChatContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => blockContent(req, args)),
    clearChatFlag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateFlag(req, args, 'clearFlag')),
    recallChatContent: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => recallContent(req, args)),
    setChatFlag: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateFlag(req, args, 'setFlag')),
    updateChatLastViewedAt: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateLastViewedAt(req, args)),
    updateChatTitle: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => updateTitle(req, args)),
  },
};
