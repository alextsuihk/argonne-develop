/**
 * Common Mongoose Model & Sub-Schema
 */
import type { InferSchemaType, Types } from 'mongoose';
import { Schema } from 'mongoose';

export type { Locale } from '@argonne/common';

export type Id = { _id: Types.ObjectId };

export const discriminatorKey = { discriminatorKey: 'kind' };

export const baseDefinition = {
  idx: { type: Number, default: () => Math.floor(Math.random() * 100) }, // for offline batching processing
  flags: [String],
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  remarks: [
    {
      _id: false,
      t: { type: Date, default: Date.now, required: true },
      u: { type: String, required: true },
      m: { type: String, required: true },
    },
  ],

  createdAt: { type: Date, default: Date.now }, // indexing updatedAt instead
  updatedAt: { type: Date, default: Date.now, index: true }, // need for fetching modified documents when querying
  deletedAt: Date,
};

const baseSchema = new Schema(baseDefinition);
export type Remarks = { remarks: { t: Date; u: string; m: string }[] };
export type BaseDocument = Omit<InferSchemaType<typeof baseSchema>, 'remarks'> & Remarks;

/**
 * bidDefinition
 */
export const bidDefinition = {
  _id: false, // use user for id
  bidder: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bounty: Number,
  contents: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
};
export type Bids = { bids: { bidder: Types.ObjectId; bounty?: number | null; contents: Types.ObjectId[] }[] };

/**
 * localSchema
 */
export const localeSchema = new Schema(
  { enUS: { type: String, required: true }, zhCN: { type: String }, zhHK: { type: String, required: true } },
  { _id: false },
);

/**
 * pointSchema
 */
export const pointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point',
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

/**
 * memberDefinition
 * schema is an object, definition is plain
 */
export const memberDefinition = {
  _id: false,
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  flags: [String],
  lastViewedAt: { type: Date, default: Date.now },
};
export type Members = { members: { user: Types.ObjectId; flags: string[]; lastViewedAt: Date }[] };

/**
 * stashDefinition
 */
export const stashDefinition = {
  _id: { type: Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  secret: { type: String, required: true },
  url: { type: String, required: true },
};
export type Stashes = { stashes: { _id: Types.ObjectId; title: string; secret: string; url: string }[] };
