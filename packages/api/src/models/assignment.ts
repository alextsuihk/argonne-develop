/**
 * Model: Assignment
 *
 * teacher assigns assignment to multiple students (as homework)
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['classroom']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const assignmentSchema = new Schema(
  {
    ...baseDefinition,

    classroom: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true },
    chapter: String,
    title: String,
    deadline: { type: Date, required: true },

    bookAssignments: [{ type: Schema.Types.ObjectId, ref: 'BookAssignment' }],
    manualAssignments: [String],
    maxScores: [Number],
    job: { type: Schema.Types.ObjectId, ref: 'Job' }, // grading job

    homeworks: [{ type: Schema.Types.ObjectId, ref: 'Homework' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

assignmentSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Assignment = model('Assignment', assignmentSchema);
export type AssignmentDocument = InferSchemaType<typeof assignmentSchema> & Id;

export default Assignment;
