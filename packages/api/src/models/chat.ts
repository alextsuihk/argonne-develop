/**
 * Model: Chat
 *
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Member } from './common';
import { baseDefinition, memberDefinition } from './common';

export type { Id } from './common';

export interface ChatDocument extends BaseDocument {
  parents: string[];
  title?: string;
  members: Member[];
  contents: (string | Types.ObjectId)[];
}

const { DEFAULTS } = configLoader;

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

const Chat = model<ChatDocument>('Chat', chatSchema);
export default Chat;
