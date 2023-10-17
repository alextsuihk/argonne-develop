/**
 * Model: Access Event
 * trace user accessing sensitive data
 *
 */

import type { InferSchemaType, Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { discriminatorKey } from '../common';
import type { GenericDocument } from './generic';
import Generic from './generic';

type Log = (user: Types.ObjectId, link: string, data: unknown) => Promise<AccessEventDocument>;
interface AccessEventModel extends Model<AccessEventDocument> {
  log: Log;
}

const accessEventSchema = new Schema(
  {
    link: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  discriminatorKey,
);

const log: Log = async (user, link, data) => AccessEvent.create<Partial<AccessEventDocument>>({ user, link, data });

accessEventSchema.static('log', log);
export type AccessEventDocument = GenericDocument & InferSchemaType<typeof accessEventSchema>;
const AccessEvent = Generic.discriminator<AccessEventDocument, AccessEventModel>('AccessEvent', accessEventSchema);
export default AccessEvent;
