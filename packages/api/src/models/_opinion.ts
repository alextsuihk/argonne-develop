// todo = 'untested';

/**
 * Model: Opinion
 *
 * multi-purpose collection, for end users to opinion / survey
 *  back-end offline system will roll up the results
 *
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

const opinionSchema = new Schema(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    event: { type: String, required: true },
    contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],

    processedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.OPINION },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Opinion = model('Opinion', opinionSchema);
export type OpinionDocument = Omit<InferSchemaType<typeof opinionSchema>, 'remarks'> & Id & Remarks;
export default Opinion;
