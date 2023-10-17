/**
 * Model: Redirect
 * "bitly" style URL shortener
 *
 */

import { addSeconds } from 'date-fns';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import Tenant from './tenant';

const { DEFAULTS } = configLoader;

const redirectSchema = new Schema(
  {
    abbr: { type: String, required: true, index: true, unique: true },
    url: { type: String, required: true },
    expireAt: { type: Date, expires: 5 }, // auto delete after expireAt + 5 seconds
  },
  {
    ...DEFAULTS.MONGOOSE.SCHEMA_OPTS,

    statics: {
      async generate(url: string, expiresIn?: number) {
        let alreadyTaken = true;
        let abbr = '';

        do {
          abbr = Math.random().toString(36).slice(2).toUpperCase();
          const [redirect, tenant] = await Promise.all([Tenant.exists({ code: abbr }), Redirect.exists({ abbr })]);
          alreadyTaken = !!redirect || !!tenant; //
        } while (alreadyTaken);

        await Redirect.create({ abbr, url, ...(expiresIn && { expireAt: addSeconds(Date.now(), expiresIn) }) });

        return abbr;
      },
    },
  },
);

export type RedirectDocument = InferSchemaType<typeof redirectSchema> & Id;
const Redirect = model('Redirect', redirectSchema);
export default Tenant;
