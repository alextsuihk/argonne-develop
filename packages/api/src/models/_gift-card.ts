// TODO: not yet in use
// maybe merge into merchandise

/**
 * Model: GiftCard
 * gift card to be redeemed to non-momentary coupon
 * for EDA free gift-card, purchasedBy is Account
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface GiftCardDocument extends BaseDocument {
  createdBy: Types.ObjectId;
  value: number;
  recipient: Types.ObjectId;
  givenAt: Date;
  redeemedAt: Date;
}

const { DEFAULTS } = configLoader;

// schema
const GiftCardSchema = new Schema<GiftCardDocument>(
  {
    ...baseDefinition,

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // purchaser
    value: Number,
    recipient: { type: Schema.Types.ObjectId, ref: 'User' },
    givenAt: Date,
    redeemedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.GIFT_CARD },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const GiftCard = model<GiftCardDocument>('GiftCard', GiftCardSchema);
export default GiftCard;
