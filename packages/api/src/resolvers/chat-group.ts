/**
 * Resolver: Chat-Group
 *
 */

import type { Ctx } from '../apollo';
import chatGroupController from '../controllers/chat-group';
import { tryCatch } from './root';

type unk = unknown;

const { addMembers, create, find, findOne, join, leave, removeUsers, update } = chatGroupController;

export default {
  Query: {
    chatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    chatGroups: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },
  Mutation: {
    addChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addChatGroupAdmins: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addMembers(req, args, 'addAdmins')),
    addChatGroupUsers: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addMembers(req, args, 'addUsers')),

    joinChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => join(req, args)),
    leaveChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => leave(req, args)),
    removeChatGroupUsers: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => removeUsers(req, args)),
    toAlexChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args, 'toAlex')),
    toAdminChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args, 'toAdmin')),
    toTenantAdminsChatGroup: async (_: unk, args: unk, { req }: Ctx) =>
      tryCatch(() => create(req, args, 'toTenantAdmins')),
    updateChatGroup: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
