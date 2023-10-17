/**
 * Model: VerificationToken
 *
 * for
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';
import type { InferSchemaType, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields

export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const verificationTokenSchema = new Schema(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messenger: { type: String, required: true },
    token: { type: String, default: () => (Math.floor(Math.random() * 899999) + 100000).toString() },
    attempt: { type: Number, default: 0 }, // delete the verificationToken if too many failed attempts
    expireAt: { type: Date, default: () => addDays(Date.now(), 1), expires: 5 }, // auto-delete when expireAt
  },
  {
    ...DEFAULTS.MONGOOSE.SCHEMA_OPTS,
    statics: {
      async send(user: Types.ObjectId, provider: string, account: string) {
        const messenger = `${provider.toLowerCase()}#${account}`; // lowercased provider for unverified
        await this.deleteOne({ user, messenger }); // delete old token if exists
        const created = await this.create({ user, messenger });

        console.log('send token via service for hub-Mode, for satellite, request hub to send token ');
        return created.toObject();
      },
    },
  },
);

verificationTokenSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const VerificationToken = model('VerificationToken', verificationTokenSchema);
export type VerificationTokenDocument = InferSchemaType<typeof verificationTokenSchema> & Id;
export default VerificationToken;
