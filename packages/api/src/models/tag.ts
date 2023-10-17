/**
 * Model: Tag
 *
 */

import { LOCALE } from '@argonne/common';
import { InferSchemaType, model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition, localeSchema } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const tagSchema = new Schema(
  {
    ...baseDefinition,

    name: { type: localeSchema, required: true },
    description: { type: localeSchema, required: true },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

tagSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Tag = model('Tag', tagSchema);
export type TagDocument = InferSchemaType<typeof tagSchema> & Id;

export default Tag;
