/**
 * Model: Chat
 *
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition, memberDefinition } from './common';

const { DEFAULTS } = configLoader;

const chatSchema = new Schema(
  {
    ...baseDefinition,

    parents: [String],
    title: String,
    members: [memberDefinition],
    contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Chat = model('Chat', chatSchema);
export type ChatDocument = InferSchemaType<typeof chatSchema> & Id;
export default Chat;
