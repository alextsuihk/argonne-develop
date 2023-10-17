/**
 * Model: ChatGroup
 *
 */

import { LOCALE } from '@argonne/common';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { CHAT_GROUP, SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'description']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const chatGroupSchema = new Schema(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true }, // undefined for admin message (or non tenant chat)
    title: String,
    description: String,
    membership: { type: String, default: CHAT_GROUP.MEMBERSHIP.NORMAL },
    users: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    marshals: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],

    key: { type: String, index: true },
    url: String,
    logoUrl: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

chatGroupSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const ChatGroup = model('ChatGroup', chatGroupSchema);
export type ChatGroupDocument = InferSchemaType<typeof chatGroupSchema> & Id;
export default ChatGroup;
