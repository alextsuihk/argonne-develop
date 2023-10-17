/**
 * Model: Session Analytic
 *
 */

import type { InferSchemaType } from 'mongoose';
import { Schema } from 'mongoose';

import { discriminatorKey, pointSchema } from '../common';
import type { GenericDocument } from './generic';
import Analytic from './generic';

const sessionAnalyticSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    fullscreen: { type: Boolean, alias: 'fs', required: true },
    token: { type: String, required: true },
    ua: { type: String, required: true },
    ip: { type: String, required: true },
    location: pointSchema,
  },
  discriminatorKey,
);

export type SessionAnalyticDocument = GenericDocument & InferSchemaType<typeof sessionAnalyticSchema>;
const SessionAnalytic = Analytic.discriminator<SessionAnalyticDocument>('SessionAnalytic', sessionAnalyticSchema);
export default SessionAnalytic;
