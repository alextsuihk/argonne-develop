/**
 * Model: Token
 *
 * manage JWT (session-like) tokens
 *
 * token is too long to be indexed,
 *  our strategy is: indexing tokenExp or user, then query token
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';

const { DEFAULTS } = configLoader;

const tokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true }, // ! (accessToken) JWT is too long to be indexed
    expireAt: { type: Date, required: true, expires: 5 }, // auto delete expireAt + 5 seconds

    authUser: { type: Schema.Types.ObjectId, ref: 'User' }, // original auth User in case of impersonated,
    ip: { type: String, required: true },
    ua: { type: String, required: true },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Token = model('Token', tokenSchema);
export type TokenDocument = InferSchemaType<typeof tokenSchema> & Id;
export default Token;
