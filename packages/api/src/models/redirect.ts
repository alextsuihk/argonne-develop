/**
 * Model: Redirect
 * "bitly" style URL shortener
 *
 */

import type { RedirectAction } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Document, Model } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import token from '../utils/token';
import Tenant from './tenant';
import type { Id, UserDocument } from './user';

export type { Id } from './common';

export interface RedirectDocument extends Document {
  abbr: string;
  action: string;
  expireAt?: Date;
}

interface RedirectModel extends Model<RedirectDocument> {
  genAccessToken(user: UserDocument & Id, url: string): Promise<string>;
  generate(url: string, expiresIn?: number): Promise<string>;
}

const { DEFAULTS } = configLoader;

const redirectSchema = new Schema<RedirectDocument>(
  {
    abbr: { type: String, index: true },
    action: String,
    expireAt: { type: Date, expires: 1000 },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const uniqueAbbr = async (action: RedirectAction, expiresIn?: number) => {
  let unique = false;
  let abbr = Math.random().toString(36).slice(2).toUpperCase();
  while (!unique) {
    abbr = Math.random().toString(36).slice(2).toUpperCase();
    const [redirect, tenant] = await Promise.all([
      Tenant.findOne({ code: abbr }).lean(),
      Redirect.findOne({ abbr }).lean(),
    ]);
    unique = !redirect && !tenant;
  }

  const fields = { abbr, action: JSON.stringify(action) };
  await Redirect.create(expiresIn ? { ...fields, expireAt: addSeconds(Date.now(), expiresIn) } : fields);

  return abbr;
};

/**
 * Generate temporary auth Access Token
 */
redirectSchema.static('genAccessToken', async (user: UserDocument & Id, url: string) => {
  const generated = await token.generate(user, {
    ip: '0.0.0.0',
    ua: '',
    expiresIn: DEFAULTS.REDIRECT.EXPIRES,
    force: true,
  });
  const { accessToken, accessTokenExpireAt } = generated;

  const action: RedirectAction = { url, token: accessToken, expireAt: accessTokenExpireAt };
  const abbr = await uniqueAbbr(action, DEFAULTS.REDIRECT.EXPIRES);
  return abbr;
});

redirectSchema.static(
  'generate',
  async (url: string, expiresIn?: number): Promise<string> => uniqueAbbr({ url }, expiresIn),
);

const Redirect = model<RedirectDocument, RedirectModel>('Redirect', redirectSchema);
export default Tenant;
