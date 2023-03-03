/**
 * Model: ChatGroup
 *
 */

import { LOCALE } from '@argonne/common';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { ChatDocument } from './chat';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export interface ChatGroupDocument extends BaseDocument {
  tenant?: string | Types.ObjectId;
  title?: string;
  description?: string;
  membership: string;
  users: (string | Types.ObjectId)[];
  admins: (string | Types.ObjectId)[];
  chats: (string | Types.ObjectId | ChatDocument)[];

  adminKey?: string;
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

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    title: String,
    description: String,
    membership: { type: String, default: CHAT_GROUP.MEMBERSHIP.NORMAL },
    users: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],

    adminKey: { type: String, index: true },
    key: { type: String, index: true },
    url: String,
    logoUrl: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

chatGroupSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const ChatGroup = model<ChatGroupDocument>('ChatGroup', chatGroupSchema);
export default ChatGroup;
