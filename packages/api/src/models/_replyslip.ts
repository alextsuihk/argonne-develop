/**
 * Model: ReplySlip
 *
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
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
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        parent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        repliedAt: Date,
        answer: Number,
      },
    ],
    createdAt: { type: Date, default: Date.now, expires: DEFAULTS.MONGOOSE.EXPIRES.REPLY_SLIP },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const ReplySlip = model('ReplySlip', replySlipSchema);
export type ReplySlipDocument = InferSchemaType<typeof replySlipSchema> & Id;
export default ReplySlip;
