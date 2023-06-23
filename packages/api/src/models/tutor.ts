/**
 * Model: Tutor
 *
 * note: if an user is a tutor for two tenants, two documents are created.
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface TutorDocument extends BaseDocument {
  tenant: string | Types.ObjectId;
  user: string | Types.ObjectId;

  intro?: string;
  officeHour?: string;

  credentials: {
    _id: string | Types.ObjectId; // _id is ObjectID typed, but Mongoose query treats as string
    title: string;
    proofs: string[];
    updatedAt: Date;
    verifiedAt?: Date;
  }[];

  specialties: {
    _id: string | Types.ObjectId; // _id is ObjectID typed, but Mongoose query treats as string
    note?: string;
    lang: string;

    level: string | Types.ObjectId;
    subject: string | Types.ObjectId;
    deletedAt?: Date;

    priority?: number;
    ranking: {
      correctness: number;
      explicitness: number;
      punctuality: number;
    };
  }[];

  rankingUpdatedAt: Date;
  star?: number;
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['intro', 'specialties.level', 'specialties.subject']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const tutorSchema = new Schema<TutorDocument>(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },

    intro: String,
    officeHour: String,

    credentials: [
      {
        title: String,
        proofs: [String],
        updatedAt: { type: Date, default: Date.now },
        verifiedAt: { type: Date },
      },
    ],

    specialties: [
      {
        note: String,
        lang: String, // question lang enum['TnC', 'SnC', 'TnM', 'EsC', etc]

        subject: { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
        level: { type: Schema.Types.ObjectId, ref: 'Level', index: true },
        deletedAt: Date,

        priority: { type: Number, default: 0 }, // for dispatch priority (percentage)
        ranking: {
          correctness: { type: Number, default: 0 },
          explicitness: { type: Number, default: 0 },
          punctuality: { type: Number, default: 0 },
        },
      },
    ],

    rankingUpdatedAt: { type: Date, default: Date.now },
    star: Number,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

tutorSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Tutor = model<TutorDocument>('Tutor', tutorSchema);
export default Tutor;
