/**
 * Model: Approval
 *
 *
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import { randomString } from '../utils/helper';
import type { Id } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

export const NEW_JOB_CHANNEL = `new-job-${randomString()}`;

const jobSchema = new Schema(
  {
    ...baseDefinition,

    requestor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    approvers: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    approvedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.APPROVAL },

    task: String,
    result: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Approval = model('Approval', jobSchema);
export type ApprovalDocument = InferSchemaType<typeof jobSchema> & Id;
export default Approval;
