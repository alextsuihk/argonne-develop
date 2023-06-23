/**
 * BaseModel
 *
 * all other models should be extended from this baseModel
 */

import type { Types } from 'mongoose';
import { Schema } from 'mongoose';

import type { Remark } from './remark';
import { remarkDefinition } from './remark';
export type { Locale } from '@argonne/common';

export type Id = { _id: Types.ObjectId };

export interface BaseDocument {
  idx: number;
  flags: string[];
  tags: (string | Types.ObjectId)[];
  remarks: Remark[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export const baseDefinition = {
  idx: {
    type: Number,
    default: () => Math.floor(Math.random() * 100),
  }, // for offline batching processing
  flags: [String],
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  remarks: [remarkDefinition],

  createdAt: { type: Date, default: Date.now }, // indexing updatedAt instead
  updatedAt: { type: Date, default: Date.now, index: true }, // need for fetching modified documents when querying
  deletedAt: Date,
};

export const localeDefinition = {
  enUS: String,
  zhCN: String,
  zhHK: String,
};
