// todo = 'untested';

/**
 * Model: Merchandise
 *
 * list of goods/merchandise
 *
 * TODO: model/inventory to trace in/out and actual cost
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition, localeSchema } from './common';

const { DEFAULTS } = configLoader;

const merchandiseSchema = new Schema(
  {
    ...baseDefinition,
    owner: { type: Schema.Types.ObjectId, ref: 'Ref', required: true, index: true },
    name: { type: localeSchema, required: true },

    amount: { type: Number, required: true },
    availability: { type: Number, required: true },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Merchandise = model('Merchandise', merchandiseSchema);
export type MerchandiseDocument = Omit<InferSchemaType<typeof merchandiseSchema>, 'remarks'> & Id & Remarks;
export default Merchandise;
