/**
 * Model: UserInterest
 *
 * internal collection to track users' interests
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

const userInterestSchema = new Schema(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    topic: { type: String, required: true, index: true },
    weight: { type: Number, required: true },

    createdAt: { type: Date, default: Date.now, expires: DEFAULTS.MONGOOSE.EXPIRES.USER_INTEREST },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const UserInterest = model('UserInterest', userInterestSchema);
export type UserInterestDocument = Omit<InferSchemaType<typeof userInterestSchema>, 'remarks'> & Id & Remarks;
export default UserInterest;
