/**
 * Model: Log Event
 *
 */

import { Schema } from 'mongoose';

import type { GenericDocument } from './generic';
import Generic, { options } from './generic';

export interface LogEventDocument extends GenericDocument {
  level: string;
  extra: unknown; // we don't process nor care the detailed format
  url: string;
}

const logEventSchema = new Schema<LogEventDocument>(
  {
    level: String,
    extra: Schema.Types.Mixed,
    url: String,
  },
  options,
);

const LogEvent = Generic.discriminator('LogEvent', logEventSchema);
export default LogEvent;
