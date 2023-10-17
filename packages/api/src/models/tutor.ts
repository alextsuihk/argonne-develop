/**
 * Model: Tutor
 *
 * ! note: school tenant does not support tutor, therefore, tutors could ONLY exist in hubMode (it affects multiple implementation)
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['intro', 'specialties.level', 'specialties.subject']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const tutorSchema = new Schema(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    intro: String,
    officeHour: String,

    credentials: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        title: { type: String, required: true },
        proofs: [String],
        updatedAt: { type: Date, default: Date.now },
        verifiedAt: { type: Date },
      },
    ],

    specialties: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },

        note: String,
        langs: [{ type: String, required: true }], // question lang enum['TnC', 'SnC', 'TnM', 'EsC', etc]

        level: { type: Schema.Types.ObjectId, ref: 'Level', required: true, index: true },
        subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
        priority: { type: Number, default: 0 }, // for dispatch priority (percentage)
      },
    ],

    // rankings are regardless of tenant(s) & lang(s)
    rankings: [
      {
        _id: false,
        level: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
        subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },

        correctness: Number,
        explicitness: Number,
        punctuality: Number,
      },
    ],
    rankingsUpdatedAt: Date,

    star: Number,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

tutorSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Tutor = model('Tutor', tutorSchema);
export type TutorDocument = InferSchemaType<typeof tutorSchema> & Id;
export default Tutor;
