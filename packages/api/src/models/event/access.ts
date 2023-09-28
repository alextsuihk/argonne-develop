/**
 * Model: Access Event
 * trace user accessing sensitive data
 *
 */

import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import type { GenericDocument } from './generic';
import Generic, { options } from './generic';

export interface AccessEventDocument extends GenericDocument {
  link: string;
  code: number;
  data?: unknown;
}

type Log = (user: string | Types.ObjectId, link: string, data: unknown) => Promise<AccessEventDocument>;
interface AccessEventModel extends Model<AccessEventDocument> {
  log: Log;
}

const accessEventSchema = new Schema<AccessEventDocument>(
  {
    link: String,
    code: Number,
    data: Schema.Types.Mixed,
  },
  options,
);

const log: Log = async (user, link, data) => AccessEvent.create<Partial<AccessEventDocument>>({ user, link, data });
accessEventSchema.static('log', log);
const AccessEvent = Generic.discriminator<AccessEventDocument, AccessEventModel>('AccessEvent', accessEventSchema);
export default AccessEvent;
