/**
 * Model: Classroom - Assignment - Homework
 *  reserved for school-used
 *  Class, e.g. Math Class (1A)
 *
 * ! note: classroom should only last for a single school year
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { ChatDocument } from './chat';
import type { BaseDocument, Id } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface ClassroomDocument extends BaseDocument {
  tenant: string | Types.ObjectId;
  level: string | Types.ObjectId;
  subject: string | Types.ObjectId;
  year: string;
  schoolClass: string; // e.g. 1-A
  title?: string;
  room?: string;
  schedule?: string;

  books: (string | Types.ObjectId)[];

  teachers: (string | Types.ObjectId)[];
  students: (string | Types.ObjectId)[];

  chats: (string | Types.ObjectId | (ChatDocument & Id))[];
  assignments: (string | Types.ObjectId)[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['year']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const classroomSchema = new Schema<ClassroomDocument>(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    level: { type: Schema.Types.ObjectId, ref: 'Level' },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
    year: { type: String, index: true },
    schoolClass: String,
    title: String,
    room: String,
    schedule: String,

    books: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    teachers: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    students: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
    assignments: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

classroomSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Classroom = model<ClassroomDocument>('Classroom', classroomSchema);
export default Classroom;
