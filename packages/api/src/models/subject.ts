/**
 * Model: Subject
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition, localeSchema } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const subjectSchema = new Schema(
  {
    ...baseDefinition,

    name: { type: localeSchema, required: true },
    levels: [{ type: Schema.Types.ObjectId, ref: 'Level' }], // possible levels
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

subjectSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Subject = model('Subject', subjectSchema);
export type SubjectDocument = Omit<InferSchemaType<typeof subjectSchema>, 'remarks'> & Id & Remarks;
export default Subject;
