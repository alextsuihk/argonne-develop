/**
 * Model: Typography
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export interface TypographyDocument extends BaseDocument {
  key: string;
  title: Locale;
  content: Locale;
  customs: { _id: string | Types.ObjectId; tenant: string | Types.ObjectId; title: Locale; content: Locale }[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['tenant', 'key']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const typographySchema = new Schema<TypographyDocument>(
  {
    ...baseDefinition,

    key: String,
    title: localeDefinition,
    content: localeDefinition,
    customs: [
      {
        tenant: { type: Schema.Types.ObjectId, ref: 'Tenant' },
        title: localeDefinition,
        content: localeDefinition,
      },
    ],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

typographySchema.index({ tenant: 'text', key: 'text' }, { name: 'Search' }); // text search
const Typography = model<TypographyDocument>('Typography', typographySchema);
export default Typography;
