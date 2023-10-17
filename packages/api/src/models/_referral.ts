// TODO: not yet in use
/**
 * Model: Referral
 *
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

const referralSchema = new Schema(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true },

    updatedAt: { type: Date, default: Date.now, expires: DEFAULTS.MONGOOSE.EXPIRES.REFERRAL },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Referral = model('Referral', referralSchema);
export type ReferralDocument = InferSchemaType<typeof referralSchema> & Id;
export default Referral;
