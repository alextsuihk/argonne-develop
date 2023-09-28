/**
 * Model: Token
 *
 * manage JWT (session-like) tokens
 *
 * token is too long to be indexed,
 *  our strategy is: indexing tokenExp or user, then query token
 */

import type { Document, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';

export interface TokenDocument extends Document {
  user: Types.ObjectId;
  token: string;
  expireAt: Date;
  authUser: string | Types.ObjectId;
  ip: string;
  ua: string;
  createdAt: Date;
  updatedAt: Date;
}

const { DEFAULTS } = configLoader;

const tokenSchema = new Schema<TokenDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    token: String, // ! (accessToken) JWT is too long to be indexed
    expireAt: { type: Date, expires: 5 }, // auto delete expireAt + 5 seconds

    authUser: { type: Schema.Types.ObjectId, ref: 'User' }, // original auth User in case of impersonated,
    ip: String,
    ua: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Token = model<TokenDocument>('Token', tokenSchema);

export default Token;
