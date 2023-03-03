/**
 * Model: Tag
 *
 */

import { LOCALE } from '@argonne/common';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export interface TagDocument extends BaseDocument {
  name: Locale;
  description: Locale;
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const tagSchema = new Schema<TagDocument>(
  {
    ...baseDefinition,

    name: localeDefinition,
    description: localeDefinition,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

tagSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Tag = model<TagDocument>('Tag', tagSchema);
export default Tag;
