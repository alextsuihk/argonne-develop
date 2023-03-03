/**
 * Model: Database (modify) Event
 *
 */

import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import type { GenericDocument } from './generic';
import Generic, { options } from './generic';

export interface DatabaseEventDocument extends GenericDocument {
  link: string;
  action: string;
  data?: unknown;
}

interface DatabaseEventModel extends Model<DatabaseEventDocument> {
  log(
    user: string | Types.ObjectId | null,
    link: string,
    action: string,
    data?: unknown,
  ): Promise<DatabaseEventDocument>;
}

const databaseEventSchema = new Schema<DatabaseEventDocument>(
  {
    link: String,
    action: String,
    data: Schema.Types.Mixed,
  },
  options,
);

databaseEventSchema.static(
  'log',
  async (
    user: string | Types.ObjectId | null,
    link: string,
    action: string,
    data?: unknown,
  ): Promise<DatabaseEventDocument> => DatabaseEvent.create({ user, link, action, data }),
);

const DatabaseEvent = Generic.discriminator<DatabaseEventDocument, DatabaseEventModel>(
  'DatabaseEvent',
  databaseEventSchema,
);
export default DatabaseEvent;
