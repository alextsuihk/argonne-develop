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

interface AccessEventModel extends Model<AccessEventDocument> {
  log(user: string | Types.ObjectId, link: string, data: unknown): Promise<AccessEventDocument>;
}

const accessEventSchema = new Schema<AccessEventDocument>(
  {
    link: String,
    code: Number,
    data: Schema.Types.Mixed,
  },
  options,
);

accessEventSchema.static(
  'log',
  async (user: string | Types.ObjectId, link: string, data: unknown): Promise<AccessEventDocument> =>
    AccessEvent.create({ user, link, data }),
);

const AccessEvent = Generic.discriminator<AccessEventDocument, AccessEventModel>('AccessEvent', accessEventSchema);
export default AccessEvent;
