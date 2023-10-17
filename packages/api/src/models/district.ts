/**
 * Model: District
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
const searchLocaleFields: string[] = ['name', 'region']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const districtSchema = new Schema(
  {
    ...baseDefinition,
    region: { type: localeSchema, required: true },
    name: { type: localeSchema, required: true },
    rates: [Number],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

// ! Caveat: mongo text-search treats (doc containing) "元朗區" as a single word, searching "元朗" will not work
districtSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const District = model('District', districtSchema);
export type DistrictDocument = InferSchemaType<typeof districtSchema> & Id;
export default District;
