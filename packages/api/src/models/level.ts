/**
 * Model: Level
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export interface LevelDocument extends BaseDocument {
  code: string;
  name: Locale;
  nextLevel?: string | Types.ObjectId;
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const levelSchema = new Schema<LevelDocument>(
  {
    ...baseDefinition,

    code: { type: String, uppercase: true, unique: true },
    name: localeDefinition,
    nextLevel: { type: Schema.Types.ObjectId, ref: 'Level' },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

levelSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Level = model<LevelDocument>('Level', levelSchema);
export default Level;
