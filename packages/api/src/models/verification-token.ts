/**
 * Model: VerificationToken
 *
 * for
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';
import type { Model, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Id } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

export interface VerificationTokenDocument extends BaseDocument {
  user: Types.ObjectId;
  messenger: string;
  token: string;
  attempt: number; // delete the verificationToken if too many failed attempts
  expireAt: Date;
}

type Send = (user: Types.ObjectId, provider: string, account: string) => Promise<VerificationTokenDocument & Id>;
interface VerificationTokenModel extends Model<VerificationTokenDocument> {
  send: Send;
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields

export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const verificationTokenSchema = new Schema<VerificationTokenDocument>(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User' },
    messenger: String,
    token: { type: String, default: () => (Math.floor(Math.random() * 899999) + 100000).toString() },
    attempt: { type: Number, default: 0 },
    expireAt: { type: Date, default: addDays(Date.now(), 1), expires: 5 }, // auto-delete when expireAt
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const send: Send = async (user, provider, account) => {
  const messenger = `${provider.toLowerCase()}#${account}`;
  await VerificationToken.deleteOne({ user, messenger }); // delete old token if exists
  const created = await VerificationToken.create<Partial<VerificationTokenDocument>>({ user, messenger });

  console.log('send token via service for hub-Mode, for satellite, request hub to send token ');
  return created.toObject();
};
verificationTokenSchema.static('send', send);

verificationTokenSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const VerificationToken = model<VerificationTokenDocument, VerificationTokenModel>(
  'VerificationToken',
  verificationTokenSchema,
);
export default VerificationToken;
