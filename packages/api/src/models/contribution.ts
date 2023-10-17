// TODO: WIP:

/**
 * Model: Contribution
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'description']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const contributionSchema = new Schema(
  {
    ...baseDefinition,

    title: { type: String, required: true },
    description: String,
    contributors: [
      {
        _id: false, // user is unique, _id is not needed
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        school: { type: Schema.Types.ObjectId, ref: 'School' },
      },
    ],

    urls: [String],

    book: { type: Schema.Types.ObjectId, ref: 'Book' },
    chapter: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

contributionSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Contribution = model('Contribution', contributionSchema);
export type ContributionDocument = InferSchemaType<typeof contributionSchema> & Id;
export default Contribution;
