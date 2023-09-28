/**
 * Model: Subject
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export type { Id } from './common';

export interface SubjectDocument extends BaseDocument {
  name: Locale;
  levels: Types.ObjectId[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const subjectSchema = new Schema<SubjectDocument>(
  {
    ...baseDefinition,

    name: localeDefinition,
    levels: [{ type: Schema.Types.ObjectId, ref: 'Level' }], // possible levels
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

subjectSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Subject = model<SubjectDocument>('Subject', subjectSchema);
export default Subject;
