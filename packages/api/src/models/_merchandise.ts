// todo = 'untested';

/**
 * Model: Merchandise
 *
 * list of goods/merchandise
 *
 * TODO: model/inventory to trace in/out and actual cost
 */

import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export interface MerchandiseDocument extends BaseDocument {
  owner: string | Types.ObjectId;
  name: Locale;

  amount: number;
  availability: number;
}

const { DEFAULTS } = configLoader;

const merchandiseSchema = new Schema<MerchandiseDocument>(
  {
    ...baseDefinition,
    owner: { type: Schema.Types.ObjectId, ref: 'Ref', index: true },
    name: localeDefinition,

    amount: Number,
    availability: Number,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Merchandise = model<MerchandiseDocument>('Merchandise', merchandiseSchema);

export default Merchandise;
