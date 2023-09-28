/**
 * Model: TutorRanking
 *
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface TutorRankingDocument extends BaseDocument {
  tenant: Types.ObjectId;
  tutor: Types.ObjectId;
  student: Types.ObjectId;

  question: Types.ObjectId;
  lang: string;
  level: Types.ObjectId;
  subject: Types.ObjectId;

  correctness: number;
  explicitness: number;
  punctuality: number;
}

const { DEFAULTS } = configLoader;

const tutorRankingSchema = new Schema<TutorRankingDocument>(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant' },

    tutor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User' },

    question: { type: Schema.Types.ObjectId, ref: 'Question' },
    lang: String, // question lang enum['TnC', 'SnC', 'TnM', 'EsC', etc]
    subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
    level: { type: Schema.Types.ObjectId, ref: 'Level' },

    correctness: { type: Number, default: 0 },
    explicitness: { type: Number, default: 0 },
    punctuality: { type: Number, default: 0 },

    updatedAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: DEFAULTS.MONGOOSE.EXPIRES.TUTOR_RANKING,
    },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const TutorRanking = model<TutorRankingDocument>('TutorRanking', tutorRankingSchema);
export default TutorRanking;
