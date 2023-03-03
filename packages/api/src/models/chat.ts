/**
 * Model: Chat
 *
 */

import { LOCALE } from '@argonne/common';
import type { LeanDocument, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Member } from './common';
import { baseDefinition, memberDefinition } from './common';
import type { ContentDocument } from './content';

export interface ChatDocument extends BaseDocument {
  parents: string[];
  title?: string;
  members: Member[];
  contents: (string | Types.ObjectId | ContentDocument | LeanDocument<ContentDocument>)[];
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const chatSchema = new Schema<ChatDocument>(
  {
    ...baseDefinition,

    parents: [String],
    title: String,
    members: [memberDefinition],
    contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

chatSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Chat = model<ChatDocument>('Chat', chatSchema);
export default Chat;
