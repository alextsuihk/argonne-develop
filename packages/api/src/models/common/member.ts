/**
 * MemberSchema (Mongoose nested document)
 *
 */

import type { Types } from 'mongoose';
import { Schema } from 'mongoose';

export interface Member {
  user: Types.ObjectId;
  flags: string[];
  lastViewedAt: Date;
}

export const memberDefinition = {
  _id: false, // use user for id
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  flags: [String],
  lastViewedAt: { type: Date, default: Date.now },
};
