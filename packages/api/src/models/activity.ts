// TODO: placeholder for activity/

/**
 * Model: Activity
 *
 * for non-curriculum activities
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition, localeSchema, pointSchema } from './common';

const { ACTIVITY } = LOCALE.DB_ENUM;

const { DEFAULTS } = configLoader;

const activitySchema = new Schema(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    owners: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    status: { type: String, enum: LOCALE.DB_TYPE.ACTIVITY.STATUS, default: ACTIVITY.STATUS.DRAFT },
    title: { type: String, required: true },
    description: { type: String, required: true },
    specialNote: String,

    fee: { type: Number, required: true },
    venue: { type: String, required: true },

    address: { type: localeSchema },
    district: { type: Schema.Types.ObjectId, ref: 'District' },
    location: pointSchema,

    schedule: { type: String, required: true },
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        status: { type: String, enum: LOCALE.DB_TYPE.ACTIVITY.PARTICIPANT.STATUS, required: true },
        ranking: Number,
      },
    ],
    // TODO: status:registering, registered, declined, paid

    verifiedAt: { type: Date },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Activity = model('Activity', activitySchema);

export type ActivityDocument = Omit<InferSchemaType<typeof activitySchema>, 'participants' | 'remarks'> &
  Id &
  Remarks & { participants: { user: Types.ObjectId; status: string; ranking?: number | null }[] };
export default Activity;
