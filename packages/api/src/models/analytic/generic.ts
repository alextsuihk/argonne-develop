/**
 * Model: Generic Analytic
 *
 */

import type { Document } from 'mongoose';
import { model, Schema } from 'mongoose';

export interface GenericDocument extends Document {
  createdAt: Date;
  processedAt?: Date;
}

export const options = { discriminatorKey: 'kind' };

const genericSchema = new Schema<GenericDocument>(
  {
    createdAt: { type: Date, default: Date.now },
    processedAt: Date,
  },
  options,
);

const Generic = model<GenericDocument>('GenericAnalytic', genericSchema);
export default Generic;
