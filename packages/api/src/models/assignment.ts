/**
 * Model: Assignment
 *
 * teacher assigns assignment to multiple students (as homework)
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BookAssignmentDocument } from './book';
import type { BaseDocument, Id } from './common';
import { baseDefinition } from './common';
import type { HomeworkDocument } from './homework';

export type { Id } from './common';

export interface AssignmentDocument extends BaseDocument {
  classroom: string | Types.ObjectId;
  chapter?: string;
  title?: string;
  deadline: Date;

  bookAssignments: (string | Types.ObjectId | (BookAssignmentDocument & Id))[];
  manualAssignments: string[]; // e.g. Chapter# 1, question# 2B
  maxScores: number[];

  job?: string | Types.ObjectId; // grading job
  homeworks: (string | Types.ObjectId | (HomeworkDocument & Id))[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['classroom']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const assignmentSchema = new Schema<AssignmentDocument>(
  {
    ...baseDefinition,

    classroom: { type: Schema.Types.ObjectId, ref: 'Classroom' },
    chapter: String,
    title: String,
    deadline: Date,

    bookAssignments: [{ type: Schema.Types.ObjectId, ref: 'BookAssignment' }],
    manualAssignments: [String],
    maxScores: [Number],
    job: { type: Schema.Types.ObjectId, ref: 'Job' },

    homeworks: [{ type: Schema.Types.ObjectId, ref: 'Homework' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

assignmentSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Assignment = model<AssignmentDocument>('Assignment', assignmentSchema);

export default Assignment;
