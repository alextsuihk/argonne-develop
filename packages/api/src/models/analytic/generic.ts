/**
 * Model: Generic Analytic
 *
 */

import { InferSchemaType, model, Schema } from 'mongoose';

import type { Id } from '../common';
import { discriminatorKey } from '../common';

const genericSchema = new Schema(
  {
    createdAt: { type: Date, default: Date.now },
    processedAt: Date,
  },
  discriminatorKey,
);

const Generic = model('GenericAnalytic', genericSchema);
export type GenericDocument = InferSchemaType<typeof genericSchema> & Id;
export default Generic;
