/**
 * Model: Classroom - Assignment - Homework
 *  reserved for school-used
 *  Class, e.g. Math Class (1A)
 *
 * ! note: classroom should only last for a single school year
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['year']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const classroomSchema = new Schema(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    level: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    year: { type: String, required: true, index: true },
    schoolClass: { type: String, required: true }, // e.g 1A
    title: String,
    room: String,
    schedule: String,

    books: [{ type: Schema.Types.ObjectId, ref: 'Book' }],

    teachers: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    students: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
    assignments: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

classroomSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Classroom = model('Classroom', classroomSchema);
export type ClassroomDocument = Omit<InferSchemaType<typeof classroomSchema>, 'remarks'> & Id & Remarks;
export default Classroom;
