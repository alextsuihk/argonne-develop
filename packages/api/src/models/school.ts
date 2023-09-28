/**
 * Model: School
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale, Point } from './common';
import { baseDefinition, localeDefinition, pointSchema } from './common';

export type { Id } from './common';

export interface SchoolDocument extends BaseDocument {
  code: string;
  name: Locale;

  address?: Locale;
  district: Types.ObjectId;
  location?: Point;

  phones: string[];
  emi?: boolean;
  band: string;

  logoUrl?: string;
  website?: string;

  funding: string;
  gender: string;
  religion: string;
  levels: Types.ObjectId[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['tel', 'website']; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const schoolSchema = new Schema<SchoolDocument>(
  {
    ...baseDefinition,

    code: { type: String, uppercase: true, unique: true },
    name: localeDefinition,

    address: localeDefinition,
    district: { type: Schema.Types.ObjectId, ref: 'District' },
    location: pointSchema,

    phones: [String],
    emi: Boolean, // English as Medium of Instruction School (英中)
    band: String,

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
const School = model<SchoolDocument>('School', schoolSchema);
export default School;
