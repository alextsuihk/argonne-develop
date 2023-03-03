/**
 * RemarkSchema (Mongoose nested document)
 *
 */

import type { Types } from 'mongoose';
import { Schema } from 'mongoose';

export interface Remark {
  t: Date;
  u?: string | Types.ObjectId;
  m: string;
}

export const remarkDefinition = {
  t: { type: Date, default: Date.now },
  u: { type: Schema.Types.ObjectId, ref: 'User' },
  m: String,
};
