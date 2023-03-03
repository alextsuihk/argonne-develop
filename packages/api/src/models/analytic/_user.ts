/**
 * Model: User Analytic
 *
 * note: store result of analysis
 * ! TODO: store directly into user.estimate
 *
 */

import type { Types } from 'mongoose';
import { Schema } from 'mongoose';

import configLoader from '../../config/config-loader';
import type { Point } from '../common';
import { pointSchema } from '../common';
import type { GenericDocument } from './generic';
import Analytic, { options } from './generic';

export type LoginType = 'login' | 'renew' | 'oauth';
export interface UserAnalyticDocument extends GenericDocument {
  user: string | Types.ObjectId;
  locations: Point[];
  activeHours: string[];
  interests: string[];
  ads: string | Types.ObjectId;
  deletedAt?: Date;
}

const { DEFAULTS } = configLoader;

const UserAnalytic = Analytic.discriminator(
  'UserAnalytic',
  new Schema<UserAnalyticDocument>(
    {
      user: { type: Schema.Types.ObjectId, ref: 'user' },
      locations: [pointSchema],
      activeHours: [String],
      interests: [String],
      ads: [{ type: Schema.Types.ObjectId, ref: 'Advertisement', index: true }],

      deletedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.USER },
    },
    options,
  ),
);

export default UserAnalytic;
