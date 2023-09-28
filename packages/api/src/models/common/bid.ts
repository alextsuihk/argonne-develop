/**
 * BidSchema (Mongoose nested document)
 *
 */

import type { Types } from 'mongoose';
import { Schema } from 'mongoose';

export interface Bid {
  bidder: Types.ObjectId;
  price?: number;
  contents: Types.ObjectId[];
}

export const bidDefinition = {
  _id: false, // use user for id
  bidder: { type: Schema.Types.ObjectId, ref: 'User' },
  price: Number,
  contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
};
