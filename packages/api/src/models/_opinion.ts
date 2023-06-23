// todo = 'untested';

/**
 * Model: Opinion
 *
 * multi-purpose collection, for end users to opinion / survey
 *  back-end offline system will roll up the results
 *
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface OpinionDocument extends BaseDocument {
  user: string | Types.ObjectId;
  event: string;
  data: unknown;
  processedAt: Date;
}

const { DEFAULTS } = configLoader;

const opinionSchema = new Schema<OpinionDocument>(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    event: String,
    data: Schema.Types.Mixed,

    processedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.OPINION },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Opinion = model<OpinionDocument>('Opinion', opinionSchema);

export default Opinion;
