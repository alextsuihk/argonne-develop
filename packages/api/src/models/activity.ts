// TODO: placeholder for activity/

/**
 * Model: Activity
 *
 * for non-curriculum activities
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Point } from './common';
import { baseDefinition, pointSchema } from './common';

export type { Id } from './common';

const { ACTIVITY } = LOCALE.DB_ENUM;

export interface ActivityDocument extends BaseDocument {
  tenant: Types.ObjectId;
  owners: Types.ObjectId[];
  status: (typeof LOCALE.DB_TYPE.ACTIVITY.STATUS)[number];
  title: string;
  description: string;
  specialNote?: string;

  fee: number;
  venue: string;
  district?: Types.ObjectId;
  location?: Point;

  schedule: string;
  participants: {
    user: Types.ObjectId;
    status: (typeof LOCALE.DB_TYPE.ACTIVITY.PARTICIPANT.STATUS)[number];
    ranking?: number;
  }[];

  verifiedAt: Date;
}

const { DEFAULTS } = configLoader;

const activitySchema = new Schema<ActivityDocument>(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    owners: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    status: { type: String, default: ACTIVITY.STATUS.DRAFT },
    title: String,
    description: String,
    specialNote: String,

    fee: Number,
    venue: String,
    district: { type: Schema.Types.ObjectId, ref: 'District' },
    location: pointSchema,

    schedule: String,
    participants: [
      { user: { type: Schema.Types.ObjectId, ref: 'User', index: true }, status: String, ranking: Number },
    ],
    // TODO: status:registering, registered, declined, paid

    verifiedAt: { type: Date },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Activity = model<ActivityDocument>('Activity', activitySchema);
export default Activity;
