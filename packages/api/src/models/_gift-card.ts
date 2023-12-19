// TODO: not yet in use
// maybe merge into merchandise

/**
 * Model: GiftCard
 * gift card to be redeemed to non-momentary coupon
 * for EDA free gift-card, purchasedBy is Account
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

// schema
const giftCardSchema = new Schema(
  {
    ...baseDefinition,

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // purchaser
    value: { type: Number, required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User' },
    givenAt: Date,
    redeemedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.GIFT_CARD },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const GiftCard = model('GiftCard', giftCardSchema);
export type GiftCardDocument = Omit<InferSchemaType<typeof giftCardSchema>, 'remarks'> & Id & Remarks;
export default GiftCard;
