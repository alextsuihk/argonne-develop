// TODO: not yet in use
/**
 * Model: Referral
 *
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export interface ReferralDocument extends BaseDocument {
  user: string | Types.ObjectId;
  email: string;
}

const { DEFAULTS } = configLoader;

const referralSchema = new Schema<ReferralDocument>(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    email: String,

    updatedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.REFERRAL },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Referral = model<ReferralDocument>('Referral', referralSchema);

export default Referral;
