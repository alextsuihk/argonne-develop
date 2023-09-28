/**
 * Model: Redirect
 * "bitly" style URL shortener
 *
 */

import { addSeconds } from 'date-fns';
import type { Document, Model } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import Tenant from './tenant';

export type { Id } from './common';

export interface RedirectDocument extends Document {
  abbr: string;
  url: string;
  expireAt?: Date;
}

type Generate = (url: string, expiresIn?: number) => Promise<string>;
interface RedirectModel extends Model<RedirectDocument> {
  generate: Generate;
}

const { DEFAULTS } = configLoader;

const redirectSchema = new Schema<RedirectDocument>(
  {
    abbr: { type: String, index: true },
    url: String,
    expireAt: { type: Date, expires: 5 }, // auto delete after expireAt + 5 seconds
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const generate: Generate = async (url, expiresIn) => {
  let alreadyTaken = true;
  let abbr = '';

  do {
    abbr = Math.random().toString(36).slice(2).toUpperCase();
    const [redirect, tenant] = await Promise.all([Tenant.exists({ code: abbr }), Redirect.exists({ abbr })]);
    alreadyTaken = !!redirect || !!tenant; //
  } while (alreadyTaken);

  await Redirect.create<Partial<RedirectDocument>>({
    abbr,
    url,
    ...(expiresIn && { expireAt: addSeconds(Date.now(), expiresIn) }),
  });

  return abbr;
};
redirectSchema.static('generate', generate);

const Redirect = model<RedirectDocument, RedirectModel>('Redirect', redirectSchema);
export default Tenant;
