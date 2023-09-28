/**
 * Model: Approval
 *
 *
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import { randomString } from '../utils/helper';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface ApprovalDocument extends BaseDocument {
  requestor: Types.ObjectId;
  approvers: Types.ObjectId[]; // list of allowed approvers
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;

  task: string; // `/questions/{$qid}`
  result?: string; // `/chat-groups/${id}`
}

const { DEFAULTS } = configLoader;

export const NEW_JOB_CHANNEL = `new-job-${randomString()}`;

const jobSchema = new Schema<ApprovalDocument>(
  {
    ...baseDefinition,

    requestor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    approvers: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    approvedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.APPROVAL },

    task: String,
    result: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Approval = model<ApprovalDocument>('Approval', jobSchema);
export default Approval;
