/**
 * Model: Approval
 *
 *
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

const approvalSchema = new Schema(
  {
    ...baseDefinition,

    requestor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    approvers: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    approvedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.APPROVAL },

    task: String, // [task#args].join('#')
    result: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Approval = model('Approval', approvalSchema);
export type ApprovalDocument = Omit<InferSchemaType<typeof approvalSchema>, 'remarks'> & Id & Remarks;
export default Approval;
