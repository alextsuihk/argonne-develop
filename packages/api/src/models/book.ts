/**
 * Model: Book
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Id } from './common';
import { baseDefinition } from './common';
import type { ContributionDocument } from './contribution';

export type { Id } from './common';

export interface BookAssignmentDocument extends BaseDocument {
  contribution: string | Types.ObjectId | (ContributionDocument & Id);

  chapter: string; // e.g 1.2#33, chapter 1.2, homework#33
  content: string | Types.ObjectId;
  dynParams: string[];
  solutions: string[]; // should be small data
  examples: (string | Types.ObjectId)[];
}

export interface BookDocument extends BaseDocument {
  publisher: string | Types.ObjectId;
  level: string | Types.ObjectId;
  subjects: (string | Types.ObjectId)[];
  title: string;
  subTitle?: string;
  chatGroup: string | Types.ObjectId;

  assignments: (string | Types.ObjectId | (BookAssignmentDocument & Id))[];

  supplements: {
    _id: string | Types.ObjectId; // _id is ObjectID typed, but Mongoose query treats as string
    contribution: string | Types.ObjectId | (ContributionDocument & Id);
    chapter: string;
    deletedAt?: Date;
  }[];

  revisions: {
    _id: string | Types.ObjectId; // _id is ObjectID typed, but Mongoose query treats as string
    rev: string;
    isbn?: string;
    year: number;
    imageUrls: string[];
    listPrice?: number;
    createdAt: Date;
    deletedAt?: Date;
  }[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'subTitle', 'revisions.isbn']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const bookAssignmentSchema = new Schema<BookAssignmentDocument>(
  {
    ...baseDefinition,

    contribution: { type: Schema.Types.ObjectId, ref: 'Contribution' },

    chapter: String,
    content: { type: Schema.Types.ObjectId, ref: 'Content' },
    dynParams: [String],
    solutions: [String],
    examples: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);
export const BookAssignment = model<BookAssignmentDocument>('BookAssignment', bookAssignmentSchema);

const bookSchema = new Schema<BookDocument>(
  {
    ...baseDefinition,

    publisher: { type: Schema.Types.ObjectId, ref: 'Publisher' },
    level: { type: Schema.Types.ObjectId, ref: 'Level', index: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject', index: true }],
    title: String,
    subTitle: String,
    chatGroup: { type: Schema.Types.ObjectId, ref: 'Chat', index: true },

    assignments: [{ type: Schema.Types.ObjectId, ref: BookAssignment }],
    supplements: [
      {
        contribution: { type: Schema.Types.ObjectId, ref: 'Contribution' },
        chapter: String,
        deletedAt: Date,
      },
    ],

    revisions: [
      {
        isbn: { type: String, index: true },
        rev: String,
        year: Number,
        listPrice: Number,
        imageUrls: [String],
        createdAt: { type: Date, default: Date.now },
        deletedAt: Date,
      },
    ],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

bookSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Book = model<BookDocument>('Book', bookSchema);
export default Book;
