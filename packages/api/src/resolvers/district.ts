/**
 * Resolver: District
 *
 */

import type { Ctx } from '../apollo';
import districtController from '../controllers/district';
import { tryCatch } from './root';

type unk = unknown;

const { addRemark, create, find, findOne, remove, update } = districtController;

export default {
  Query: {
    district: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => findOne(req, args)),
    districts: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => find(req, args)),
  },

  Mutation: {
    addDistrict: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => create(req, args)),
    addDistrictRemark: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => addRemark(req, args)),
    removeDistrict: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => remove(req, args)),
    updateDistrict: async (_: unk, args: unk, { req }: Ctx) => tryCatch(() => update(req, args)),
  },
};
