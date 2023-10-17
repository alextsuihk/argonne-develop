/**
 * Model: Database (modify) Event
 *
 */

import type { InferSchemaType, Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { discriminatorKey } from '../common';
import type { GenericDocument } from './generic';
import Generic from './generic';

type Log = (user: Types.ObjectId | null, link: string, action: string, data: unknown) => Promise<DatabaseEventDocument>;

interface DatabaseEventModel extends Model<DatabaseEventDocument> {
  log: Log;
}

const databaseEventSchema = new Schema(
  {
    link: { type: String, required: true },
    action: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  discriminatorKey,
);

const log: Log = (user, link, action, data) => DatabaseEvent.create({ ...(user && { user }), link, action, data });
databaseEventSchema.static('log', log);

type DatabaseEventDocument = GenericDocument & InferSchemaType<typeof databaseEventSchema>;
const DatabaseEvent = Generic.discriminator<DatabaseEventDocument, DatabaseEventModel>(
  'DatabaseEvent',
  databaseEventSchema,
);
export default DatabaseEvent;
