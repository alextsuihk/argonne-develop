/**
 * Model: ReplySlip
 *
 */

import type { InferSchemaType, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

const replySlipSchema = new Schema(
  {
    ...baseDefinition,

    classrooms: [{ type: Schema.Types.ObjectId, ref: 'Classroom', required: true, index: true }],

    title: { type: String, required: true },
    body: { type: String, required: true },
    choices: [String],
    replies: [
      {
        _id: false,
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        parent: { type: Schema.Types.ObjectId, ref: 'User' },
        repliedAt: Date,
        answer: Number,
        note: String,
      },
    ],
    createdAt: { type: Date, default: Date.now, expires: DEFAULTS.MONGOOSE.EXPIRES.REPLY_SLIP },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const ReplySlip = model('ReplySlip', replySlipSchema);
export type ReplySlipDocument = Omit<InferSchemaType<typeof replySlipSchema>, 'remarks' | 'replies'> &
  Id &
  Remarks & {
    replies: {
      student: Types.ObjectId;
      parent?: Types.ObjectId | null;
      repliedAt?: Date | null;
      answer?: number | null;
      note?: string | null;
    }[];
  };
export default ReplySlip;
