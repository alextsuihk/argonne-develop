/**
 * Model: Redirect
 * "bitly" style URL shortener
 *
 */

import { addSeconds } from 'date-fns';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import Tenant from './tenant';

const { DEFAULTS } = configLoader;

const ILLEGAL_ABBR = ['ALEX', 'STEM', 'TUTOR']; // uppercase

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
        let notAllowed = true;
        let abbr = '';

        do {
          abbr = Math.random().toString(36).slice(2).toUpperCase();
          const [tenant, redirect] = await Promise.all([Tenant.exists({ code: abbr }), this.exists({ abbr })]);
          notAllowed = !!redirect || !!tenant || ILLEGAL_ABBR.includes(abbr); //
        } while (notAllowed);

        await this.create({ abbr, url, ...(expiresIn && { expireAt: addSeconds(Date.now(), expiresIn) }) });

        return abbr;
      },
    },
  },
);

export type RedirectDocument = Omit<InferSchemaType<typeof redirectSchema>, 'remarks'> & Id & Remarks;
const Redirect = model('Redirect', redirectSchema);
export default Redirect;
