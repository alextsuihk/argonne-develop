/**
 * Model: Assignment
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BookAssignmentDocument } from './book';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';
import type { ContentDocument } from './content';

export interface HomeworkDocument extends BaseDocument {
  user: string | Types.ObjectId; // student's userId
  assignmentIdx: number;
  dynParamIdx?: number;

  contents: (string | Types.ObjectId | ContentDocument | LeanDocument<ContentDocument>)[];
  answer?: string;
  answeredAt?: Date;

  timeSpent?: number;
  viewedExamples?: number[]; // viewed example index

  score?: number; // (final) grade by teacher
}

export interface AssignmentDocument extends BaseDocument {
  classroom: string | Types.ObjectId;
  chapter?: string;
  title?: string;
  deadline: Date;

  bookAssignments: (string | Types.ObjectId | BookAssignmentDocument | LeanDocument<BookAssignmentDocument>)[];
  manualAssignments: string[]; // e.g. Chapter# 1, question# 2B
  maxScores?: number[];

  job?: string | Types.ObjectId; // grading job
  homeworks: (string | Types.ObjectId | HomeworkDocument | LeanDocument<HomeworkDocument>)[];
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

    classroom: { type: Schema.Types.ObjectId, ref: 'Classroom', index: true },
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

const homeworkSchema = new Schema<HomeworkDocument>(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignmentIdx: Number,
    dynParamIdx: Number,

    contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
    answer: String,
    answeredAt: Date,

    timeSpent: Number,
    viewedExamples: [Number],

    score: Number,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

export const Homework = model<HomeworkDocument>('Homework', homeworkSchema);

export default Assignment;
