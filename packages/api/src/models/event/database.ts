/**
 * Model: Database (modify) Event
 *
 */

import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import type { Id } from '../common';
import type { GenericDocument } from './generic';
import Generic, { options } from './generic';

export interface DatabaseEventDocument extends GenericDocument {
  user?: string | Types.ObjectId;
  jobId?: string; // jobId issued by satellite-sync sender
  link: string;
  action: string;
  data?: unknown;
}

type Log = (
  user: string | Types.ObjectId | null,
  link: string,
  action: string,
  data?: unknown,
  jobId?: string,
) => Promise<DatabaseEventDocument & Id>;

interface DatabaseEventModel extends Model<DatabaseEventDocument> {
  log: Log;
}

const databaseEventSchema = new Schema<DatabaseEventDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    jobId: String,
    link: String,
    action: String,
    data: Schema.Types.Mixed,
  },
  options,
);

const log: Log = (user, link, action, data, jobId) =>
  DatabaseEvent.create<Partial<DatabaseEventDocument>>({
    ...(user && { user }),
    ...(jobId && { jobId }),
    link,
    action,
    data,
  });
databaseEventSchema.static('log', log);

const DatabaseEvent = Generic.discriminator<DatabaseEventDocument, DatabaseEventModel>(
  'DatabaseEvent',
  databaseEventSchema,
);
export default DatabaseEvent;
