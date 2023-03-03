/**
 * Model: TutorRanking
 *
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export interface TutorRankingDocument extends BaseDocument {
  tenant: string | Types.ObjectId;
  tutor: string | Types.ObjectId;
  student: string | Types.ObjectId;

  question: string | Types.ObjectId;
  lang: string;
  level: string | Types.ObjectId;
  subject: string | Types.ObjectId;

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
      expires: DEFAULTS.MONGOOSE.EXPIRES.RANKING,
    },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const TutorRanking = model<TutorRankingDocument>('TutorRanking', tutorRankingSchema);
export default TutorRanking;
