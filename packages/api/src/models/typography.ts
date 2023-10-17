/**
 * Model: Typography
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition, localeSchema } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['tenant', 'key']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const typographySchema = new Schema(
  {
    ...baseDefinition,

    key: { type: String, required: true },
    title: { type: localeSchema, required: true },
    content: { type: localeSchema, required: true },
    customs: [
      {
        _id: false,
        tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
        title: { type: localeSchema, required: true },
        content: { type: localeSchema, required: true },
      },
    ],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

typographySchema.index({ tenant: 'text', key: 'text' }, { name: 'Search' }); // text search
const Typography = model('Typography', typographySchema);
export type TypographyDocument = InferSchemaType<typeof typographySchema> & Id;

export default Typography;
