/**
 * Model: Content
 *
 */
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface ContentDocument extends BaseDocument {
  parents: string[];
  creator: string | Types.ObjectId;
  data: string;
  visibleAfter?: Date; // defer visibility to later time
}

const { DEFAULTS } = configLoader;

const contentSchema = new Schema<ContentDocument>(
  {
    ...baseDefinition,

    parents: [String],
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    data: String,
    visibleAfter: Date,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Content = model<ContentDocument>('Content', contentSchema);
export default Content;
