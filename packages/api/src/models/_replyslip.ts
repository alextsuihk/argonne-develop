/**
 * Model: ReplySlip
 *
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface ReplySlipDocument extends BaseDocument {
  classrooms: Types.ObjectId[];
  title: string;
  body: string;
  choices: string[];
  replies: {
    student: Types.ObjectId;
    parent: Types.ObjectId;
    repliedAt?: Date;
    reply?: number;
  }[];
}
const { DEFAULTS } = configLoader;

const replySlipSchema = new Schema<ReplySlipDocument>(
  {
    ...baseDefinition,

    classrooms: [{ type: Schema.Types.ObjectId, ref: 'Classroom', index: true }],

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
    createdAt: { type: Date, default: Date.now, expires: DEFAULTS.MONGOOSE.EXPIRES.REPLY_SLIP },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const ReplySlip = model<ReplySlipDocument>('ReplySlip', replySlipSchema);
export default ReplySlip;
