/**
 * Model: Publisher
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

const searchFields: string[] = ['phones', 'website']; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const publisherSchema = new Schema(
  {
    ...baseDefinition,

    name: { type: localeSchema, required: true },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    phones: [String],

    logoUrl: String,
    website: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

publisherSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Publisher = model('Publisher', publisherSchema);
export type PublisherDocument = Omit<InferSchemaType<typeof publisherSchema>, 'remarks'> & Id & Remarks;
export default Publisher;
