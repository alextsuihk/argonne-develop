/**
 * Model: Session Analytic
 *
 */

import type { Types } from 'mongoose';
import { Schema } from 'mongoose';

import type { Point } from '../common';
import { pointSchema } from '../common';
import type { GenericDocument } from './generic';
import Analytic, { options } from './generic';

export interface SessionAnalyticDocument extends GenericDocument {
  user: string | Types.ObjectId;
  fullscreen: boolean;
  token: string;
  ua: string;
  ip: string;
  location: Point;
}

const sessionAnalyticSchema = new Schema<SessionAnalyticDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'user', index: true },
    fullscreen: { type: Boolean, alias: 'fs' },
    token: String,
    ua: String,
    ip: String,
    location: pointSchema,
  },
  options,
);

const SessionAnalytic = Analytic.discriminator('SessionAnalytic', sessionAnalyticSchema);
export default SessionAnalytic;
