// TODO: WIP:

/**
 * Model: Contribution
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
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
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
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
export type ContributionDocument = Omit<InferSchemaType<typeof contributionSchema>, 'remarks' | 'contributors'> &
  Id &
  Remarks & { contributors: { user: Types.ObjectId; name: string; school?: Types.ObjectId | null }[] };
export default Contribution;
