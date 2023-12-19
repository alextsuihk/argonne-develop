/**
 * Model: Content
 *
 */
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

const contentSchema = new Schema(
  {
    ...baseDefinition,

    parents: [String],
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    data: { type: String, required: true },
    visibleAfter: Date,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Content = model('Content', contentSchema);
export type ContentDocument = Omit<InferSchemaType<typeof contentSchema>, 'remarks'> & Id & Remarks;
export default Content;
