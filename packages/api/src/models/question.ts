/**
 * Model: Question
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Bid, Member } from './common';
import { baseDefinition, bidDefinition, memberDefinition } from './common';
export type { Id, Member } from './common';

export interface QuestionDocument extends BaseDocument {
  tenant: Types.ObjectId;

  parent?: Types.ObjectId; // clone from another question
  student: Types.ObjectId;
  tutor?: Types.ObjectId;
  marshals: Types.ObjectId[];

  members: Member[];

  deadline: Date;

  classroom?: Types.ObjectId;
  level: Types.ObjectId;
  subject: Types.ObjectId;
  book?: Types.ObjectId;
  bookRev?: string;
  chapter?: string;
  assignment?: Types.ObjectId;
  assignmentIdx?: number;
  dynParamIdx?: number;
  homework?: Types.ObjectId;

  lang: string;

  contents: Types.ObjectId[];
  contentIdx: number; // # of contents visible to all bidders (once tutor is assigned, new contents are not visible to bidders)
  timeSpent?: number; // time spent by tutor

  // bidding
  price?: number;

  bidders: Types.ObjectId[];
  bids: Bid[];

  paidAt?: Date;

  correctness: number;
  explicitness: number;
  punctuality: number;
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const questionSchema = new Schema<QuestionDocument>(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant' },

    parent: { type: Schema.Types.ObjectId, ref: 'Question' },
    student: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    marshals: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    members: [memberDefinition],

    deadline: Date,

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

    contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
    contentIdx: { type: Number, default: 1 },
    timeSpent: Number,

    // bidding
    price: Number, // initial offer price

    bidders: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    bids: [bidDefinition],

    paidAt: Date,

    correctness: { type: Number, default: 0 },
    explicitness: { type: Number, default: 0 },
    punctuality: { type: Number, default: 0 },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

questionSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search

// /**
//  * Virtual Property
//  */
// questionSchema.virtual('correct').get(function (this: QuestionDocument) {
//   return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.CORRECT)).length;
// });

// questionSchema.virtual('like').get(function (this: QuestionDocument) {
//   return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.LIKE)).length;
// });

// questionSchema.virtual('dislike').get(function (this: QuestionDocument) {
//   return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.DISLIKE)).length;
// });

const Question = model<QuestionDocument>('Question', questionSchema);

export default Question;
