/**
 * Resolver: Announcement
 *
 */

import type { Ctx } from '../apollo';
import announcementController from '../controllers/announcement';
import { tryCatch } from './root';

type unk = unknown;

const { create, find, findOne, remove } = announcementController;

export default {
  Query: {
    announcements: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
    announcement: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
  },

  Mutation: {
    addAnnouncement: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    removeAnnouncement: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
  },
};
