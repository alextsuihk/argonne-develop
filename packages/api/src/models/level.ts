/**
 * Model: Level
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

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const levelSchema = new Schema(
  {
    ...baseDefinition,

    code: { type: String, uppercase: true, required: true, unique: true },
    name: { type: localeSchema, required: true },
    nextLevel: { type: Schema.Types.ObjectId, ref: 'Level' },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

levelSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Level = model('Level', levelSchema);
export type LevelDocument = Omit<InferSchemaType<typeof levelSchema>, 'remarks'> & Id & Remarks;
export default Level;
