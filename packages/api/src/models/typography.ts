/**
 * Model: Typography
 *
 */

import type { Locale } from '@argonne/common';
import { LOCALE } from '@argonne/common';
import type { InferSchemaType, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
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
export type TypographyDocument = Omit<InferSchemaType<typeof typographySchema>, 'customs' | 'remarks'> &
  Id &
  Remarks & { customs: { tenant: Types.ObjectId; title: Locale; content: Locale }[] };

export default Typography;
