/**
 * Resolver: Announcement
 *
 */

import type { ApolloContext } from '../server';
import announcementController from '../controllers/announcement';
import { tryCatch } from './root';

type unk = unknown;

const { create, find, findOne, remove } = announcementController;

export default {
  Query: {
    announcements: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
    announcement: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
  },

  Mutation: {
    addAnnouncement: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    removeAnnouncement: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
  },
};
