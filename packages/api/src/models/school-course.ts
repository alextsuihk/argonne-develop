/**
 * Model: SchoolCourse
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { SCHOOL_COURSE, SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const schoolSchema = new Schema(
  {
    ...baseDefinition,

    status: { type: String, enum: LOCALE.DB_TYPE.SCHOOL_COURSE.STATUS, default: SCHOOL_COURSE.STATUS.DRAFT },

    school: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    year: { type: String, required: true },
    rev: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courses: [
      {
        _id: false,
        level: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
        subjects: [
          {
            _id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
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
const SchoolCourse = model('SchoolCourse', schoolSchema);
export type SchoolCourseDocument = InferSchemaType<typeof schoolSchema> & Id;
export default SchoolCourse;
