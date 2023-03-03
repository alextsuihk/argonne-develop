// TODO: add member.rank
// TODO: keep mongoose reference, for statistics & searching purposes

/**
 * Model: Question
 *
 * ! Note: Everything in a Single Question model
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Member } from './common';
import { baseDefinition, memberDefinition } from './common';
import type { ContentDocument } from './content';
export type { Member } from './common';

export interface BidDocument extends BaseDocument {
  messages: {
    creator: string | Types.ObjectId;
    data: string;
    createdAt: Date;
  }[];
}

interface QuestionExtra {
  price?: number;

  bidders: (string | Types.ObjectId)[];
  bids: (string | Types.ObjectId | BidDocument)[]; // hide once bided

  paidAt?: Date;
}

export interface QuestionDocument extends BaseDocument, QuestionExtra {
  tenant: string | Types.ObjectId;

  students: (string | Types.ObjectId)[];
  tutors: (string | Types.ObjectId)[];

  members: Member[];

  deadline: Date;

  classroom?: string | Types.ObjectId;
  level: string | Types.ObjectId;
  subject: string | Types.ObjectId;
  book?: string | Types.ObjectId;
  bookRev?: string;
  chapter?: string;
  assignment?: string | Types.ObjectId;
  assignmentIdx?: number;
  homework?: string | Types.ObjectId;

  lang: string;

  content: string | Types.ObjectId | ContentDocument;
  contents: (string | Types.ObjectId | ContentDocument)[];
  timeSpent?: number; // time spent by tutor
}

const { QUESTION, SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

export const questionExtraDefinition = {
  price: Number, // initial offer price

  bidders: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

  bids: [{ type: Schema.Types.ObjectId, ref: 'Bid' }],

  paidAt: Date,
};

const questionSchema = new Schema<QuestionDocument>(
  {
    ...baseDefinition,
    ...questionExtraDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant' },

    students: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    tutors: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    members: [memberDefinition],

    deadline: { type: Date, default: addDays(new Date(), 2) }, // default two days

    classroom: { type: Schema.Types.ObjectId, ref: 'Classroom' },
    level: { type: Schema.Types.ObjectId, ref: 'Level', index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', index: true },
    bookRev: String,
    chapter: String,
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    assignmentIdx: Number,
    homework: { type: Schema.Types.ObjectId, ref: 'Homework' },

    lang: { type: String, require: true },

    content: { type: Schema.Types.ObjectId, ref: 'Content' },
    contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
    timeSpent: Number,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

questionSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search

// TODO: like & dislike, correct
/**
 * Virtual Property
 */
questionSchema.virtual('correct').get(function (this: QuestionDocument) {
  return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.CORRECT)).length;
});

questionSchema.virtual('like').get(function (this: QuestionDocument) {
  return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.LIKE)).length;
});

questionSchema.virtual('dislike').get(function (this: QuestionDocument) {
  return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.DISLIKE)).length;
});

const Question = model<QuestionDocument>('Question', questionSchema);

const bidSchema = new Schema<BidDocument>({
  ...baseDefinition,
  messages: {
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    data: String,
    updatedAt: { type: Date, default: Date.now() },
  },
});
export const Bid = model<BidDocument>('Bid', bidSchema);

export default Question;

// TODO: static methods
// if bidding & pass deadline, >>> expires
// if assigned, and pass deadline >>> timeout
