/**
 * Model: Log Event
 *
 */

import { InferSchemaType, Schema } from 'mongoose';

import { discriminatorKey } from '../common';
import type { GenericDocument } from './generic';
import Generic from './generic';

const logEventSchema = new Schema(
  {
    level: { type: String, required: true },
    msg: { type: String, required: true },
    extra: Schema.Types.Mixed,
    url: String,
  },
  discriminatorKey,
);

export type LogEventDocument = GenericDocument & InferSchemaType<typeof logEventSchema>;
const LogEvent = Generic.discriminator<LogEventDocument>('LogEvent', logEventSchema);
export default LogEvent;
