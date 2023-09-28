/**
 * Model: ChatGroup
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { ChatDocument } from './chat';
import type { BaseDocument, Id } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface ChatGroupDocument extends BaseDocument {
  tenant?: Types.ObjectId;
  title?: string;
  description?: string;
  membership: string;
  users: Types.ObjectId[];
  admins: Types.ObjectId[];
  marshals: Types.ObjectId[];
  chats: (Types.ObjectId | (ChatDocument & Id))[];

  key?: string;
  url?: string;
  logoUrl?: string;
}

const { CHAT_GROUP, SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'description']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const chatGroupSchema = new Schema<ChatGroupDocument>(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    title: String,
    description: String,
    membership: { type: String, default: CHAT_GROUP.MEMBERSHIP.NORMAL },
    users: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    marshals: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],

    key: { type: String, index: true },
    url: String,
    logoUrl: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

chatGroupSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const ChatGroup = model<ChatGroupDocument>('ChatGroup', chatGroupSchema);
export default ChatGroup;
