/**
 * Model: School
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition, localeSchema, pointSchema } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['tel', 'website']; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const schoolSchema = new Schema(
  {
    ...baseDefinition,

    code: { type: String, uppercase: true, unique: true, required: true },
    name: { type: localeSchema, required: true },

    address: { type: localeSchema },
    district: { type: Schema.Types.ObjectId, ref: 'District', required: true },
    location: pointSchema,

    phones: [String],
    emi: Boolean, // English as Medium of Instruction School (英中)
    band: { type: String },

    logoUrl: String,
    website: String,

    funding: String,
    gender: String,
    religion: String,

    levels: [{ type: Schema.Types.ObjectId, ref: 'Level' }], // levels offering
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

schoolSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const School = model('School', schoolSchema);
export type SchoolDocument = InferSchemaType<typeof schoolSchema> & Id;
export default School;
