/**
 * Model: Homework
 *
 * homework belongs to a student
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { AssignmentDocument } from './assignment';
import type { BaseDocument, Id } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface HomeworkDocument extends BaseDocument {
  assignment: string | Types.ObjectId | (AssignmentDocument & Id);

  user: string | Types.ObjectId; // student's userId
  assignmentIdx: number;
  dynParamIdx?: number;

  contents: (string | Types.ObjectId)[];
  answer?: string;
  answeredAt?: Date;

  timeSpent?: number;
  viewedExamples: number[]; // viewed example index

  scores: number[]; // graded by system or teacher
  questions: (string | Types.ObjectId)[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const homeworkSchema = new Schema<HomeworkDocument>(
  {
    ...baseDefinition,

    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment' },

    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
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

const Homework = model<HomeworkDocument>('Homework', homeworkSchema);

export default Homework;
