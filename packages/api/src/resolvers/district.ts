/**
 * Resolver: District
 *
 */

import type { ApolloContext } from '../server';
import districtController from '../controllers/district';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = districtController;

export default {
  Query: {
    district: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => findOne(req, args)),
    districts: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addDistrict: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => create(req, args)),
    addDistrictRemark: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => addRemark(req, args)),
    removeDistrict: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => remove(req, args)),
    updateDistrict: async (_: unk, args: unk, { req }: ApolloContext) => tryCatch(() => update(req, args)),
  },
};
