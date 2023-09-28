/**
 * Model: District
 *
 */

import { LOCALE } from '@argonne/common';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export type { Id } from './common';

export interface DistrictDocument extends BaseDocument {
  region: Locale;
  name: Locale;
  rates: number[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name', 'region']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const districtSchema = new Schema<DistrictDocument>(
  {
    ...baseDefinition,
    region: localeDefinition,
    name: localeDefinition,
    rates: [Number],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

// ! Caveat: mongo text-search treats (doc containing) "元朗區" as a single word, searching "元朗" will not work
districtSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const District = model<DistrictDocument>('District', districtSchema);

export default District;
