/**
 * Model: Publisher
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export type { Id } from './common';

export interface PublisherDocument extends BaseDocument {
  name: Locale;
  admins: Types.ObjectId[];
  phones: string[];
  logoUrl?: string;
  website?: string;
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['phones', 'website']; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const publisherSchema = new Schema<PublisherDocument>(
  {
    ...baseDefinition,

    name: localeDefinition,
    admins: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    phones: [String],

    logoUrl: String,
    website: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

publisherSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Publisher = model<PublisherDocument>('Publisher', publisherSchema);
export default Publisher;
