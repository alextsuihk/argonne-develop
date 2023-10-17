/**
 * Model: Book
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'subTitle', 'revisions.isbn']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const bookAssignmentSchema = new Schema(
  {
    ...baseDefinition,

    contribution: { type: Schema.Types.ObjectId, ref: 'Contribution', required: true },

    chapter: { type: String, required: true },
    content: { type: Schema.Types.ObjectId, ref: 'Content', required: true },
    dynParams: [String],
    solutions: [String],
    examples: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);
export const BookAssignment = model('BookAssignment', bookAssignmentSchema);
export type BookAssignmentDocument = InferSchemaType<typeof bookAssignmentSchema> & Id;

const bookSchema = new Schema(
  {
    ...baseDefinition,

    publisher: { type: Schema.Types.ObjectId, ref: 'Publisher', required: true },
    level: { type: Schema.Types.ObjectId, ref: 'Level', required: true, index: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject', index: true }],
    title: { type: String, required: true },
    subTitle: String,
    chatGroup: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },

    assignments: [{ type: Schema.Types.ObjectId, ref: BookAssignment }],
    supplements: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        contribution: { type: Schema.Types.ObjectId, ref: 'Contribution', required: true },
        chapter: { type: String, required: true },
        deletedAt: Date,
      },
    ],

    revisions: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        rev: { type: String, required: true },
        isbn: { type: String, index: true },
        year: { type: Number, required: true },
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
const Book = model('Book', bookSchema);
export type BookDocument = InferSchemaType<typeof bookSchema> & Id;
export default Book;
