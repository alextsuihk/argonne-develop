/**
 * Model: ReplySlip
 *
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export interface ReplySlipDocument extends BaseDocument {
  title: string;
  body: string;
  choices: string[];
  replies: {
    student: string | Types.ObjectId;
    parent: string | Types.ObjectId;
    repliedAt?: Date;
    reply?: number;
  }[];
}
const { DEFAULTS } = configLoader;

const replySlipSchema = new Schema<ReplySlipDocument>(
  {
    ...baseDefinition,

    title: String,
    body: String,
    choices: [String],
    replies: [
      {
        student: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        parent: { type: Schema.Types.ObjectId, ref: 'User' },
        repliedAt: Date,
        reply: Number,
      },
    ],
    createdAt: { type: Date, default: Date.now, expires: DEFAULTS.MONGOOSE.EXPIRES.REPLYSLIP },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const ReplySlip = model<ReplySlipDocument>('ReplySlip', replySlipSchema);
export default ReplySlip;
