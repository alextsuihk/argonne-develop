/**
 * Model: SchoolCourse
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export interface SchoolCourseDocument extends BaseDocument {
  status: typeof LOCALE.DB_TYPE.SCHOOL_COURSE.STATUS[number];

  school: string | Types.ObjectId;
  year: string;

  rev: number;
  createdAt: Date;
  createdBy: string | Types.ObjectId;
  courses: {
    level: string | Types.ObjectId;
    subjects: { subject: string | Types.ObjectId; alias?: string; books: (string | Types.ObjectId)[] }[];
  }[];
}

const { SCHOOL_COURSE, SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const schoolSchema = new Schema<SchoolCourseDocument>(
  {
    ...baseDefinition,

    status: { type: String, default: SCHOOL_COURSE.STATUS.DRAFT },

    school: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    year: String,
    rev: { type: Number, default: 1 },
    createdAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    courses: [
      {
        level: { type: Schema.Types.ObjectId, ref: 'Level' },
        subjects: [
          {
            subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
            alias: String,
            books: [{ type: Schema.Types.ObjectId, ref: 'Book' }],
          },
        ],
      },
    ],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

schoolSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const SchoolCourse = model<SchoolCourseDocument>('SchoolCourse', schoolSchema);
export default SchoolCourse;
