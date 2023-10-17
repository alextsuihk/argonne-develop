/**
 * Model: Homework
 *
 * homework belongs to a student
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const homeworkSchema = new Schema(
  {
    ...baseDefinition,

    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },

    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignmentIdx: { type: Number, default: 0 },
    dynParamIdx: Number,

    contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
    answer: String,
    answeredAt: Date,

    timeSpent: Number,
    viewedExamples: [Number],

    scores: [Number],
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Homework = model('Homework', homeworkSchema);
export type HomeworkDocument = InferSchemaType<typeof homeworkSchema> & Id;
export default Homework;
