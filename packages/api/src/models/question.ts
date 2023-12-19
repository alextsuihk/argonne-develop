/**
 * Model: Question
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Bids, Id, Members } from './common';
import { baseDefinition, bidDefinition, memberDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const questionSchema = new Schema(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },

    parent: { type: Schema.Types.ObjectId, ref: 'Question' },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    marshals: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    members: [memberDefinition],

    deadline: { type: Date, required: true },

    classroom: { type: Schema.Types.ObjectId, ref: 'Classroom' },
    level: { type: Schema.Types.ObjectId, ref: 'Level', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', index: true },
    bookRev: String,
    chapter: String,
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    assignmentIdx: Number,
    homework: { type: Schema.Types.ObjectId, ref: 'Homework' },

    lang: { type: String, required: true },

    contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
    contentIdx: { type: Number, default: 1 },
    timeSpent: Number,

    // bidding
    bounty: Number, // initial offer bounty

    bidders: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    bids: [bidDefinition],

    paidAt: Date,

    correctness: Number,
    explicitness: Number,
    punctuality: Number,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

questionSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search

// /**
//  * Virtual Property
//  */
// questionSchema.virtual('correct').get(function () {
//   return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.CORRECT)).length;
// });

// questionSchema.virtual('like').get(function () {
//   return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.LIKE)).length;
// });

// questionSchema.virtual('dislike').get(function () {
//   return this.members.filter(member => member.flags?.includes(QUESTION.MEMBER.FLAG.DISLIKE)).length;
// });

const Question = model('Question', questionSchema);
export type QuestionDocument = Omit<InferSchemaType<typeof questionSchema>, 'bids' | 'members'> & Bids & Id & Members;
export default Question;
