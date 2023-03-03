/**
 * Model: Generic Event
 *
 */

import type { Document, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../../config/config-loader';

export interface GenericDocument extends Document {
  user?: string | Types.ObjectId;
  msg: string;
  createdAt: Date;
}

const { DEFAULTS } = configLoader;

export const options = { discriminatorKey: 'kind' };

const genericSchema = new Schema<GenericDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    msg: String,
    createdAt: { type: Date, default: Date.now, expires: DEFAULTS.MONGOOSE.EXPIRES.LOG },
  },
  options,
);

const Generic = model<GenericDocument>('GenericEvent', genericSchema);
export default Generic;
