/**
 * Model: Generic Event
 *
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../../config/config-loader';
import { discriminatorKey, type Id } from '../common';

const { DEFAULTS } = configLoader;

const genericSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    createdAt: { type: Date, default: Date.now, expires: DEFAULTS.MONGOOSE.EXPIRES.LOG },
  },
  discriminatorKey,
);

const Generic = model('GenericEvent', genericSchema);
export type GenericDocument = InferSchemaType<typeof genericSchema> & Id;

export default Generic;
