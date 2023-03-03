/**
 * MemberSchema (Mongoose nested document)
 *
 */

import type { Types } from 'mongoose';
import { Schema } from 'mongoose';

export interface Member {
  user: string | Types.ObjectId;
  flags: string[];
  lastViewedAt?: Date;
}

export const memberDefinition = {
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  flags: [String],
  lastViewedAt: Date,
};
