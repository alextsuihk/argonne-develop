// TODO: WIP:

/**
 * Model: Contribution
 * (including scripts)
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface ContributionDocument extends BaseDocument {
  title: string;
  description?: string;
  contributors: {
    user: string | Types.ObjectId;
    name: string; // John (P6, S3)
    school: string | Types.ObjectId;
  }[];

  urls: string[]; // YouTube, github url (with commit hash or branch), private repo for assignment, otherwise public repo

  book?: string | Types.ObjectId;
  chapter?: string; // e.g 1.2#33, chapter 1.2, homework#33
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'description']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const contributionSchema = new Schema<ContributionDocument>(
  {
    ...baseDefinition,

    title: String,
    description: String,
    contributors: [
      {
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
const Contribution = model<ContributionDocument>('Contribution', contributionSchema);
export default Contribution;
