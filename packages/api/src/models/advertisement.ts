/**
 * Model: Advertisement
 *
 * ! Note: All amounts are rounded to 1/1000 of a dollar
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

//! TODO: add calculatedPriority
// const probability = balance / Math.ceil((endAt - beginAt)/1000/60*60*24) / (0.9 * cpv + 0.1 * cpc) / audiences / dailyLimit * 100
// probability > 100: too much budget, not enough audiences
// probability = 100: should be about to push $dailyLimit times to each push targetUser
// probability = 50%: targetUser would have 50% chance to view ${dailyLimit} times per day
// The optimal probability should be 100%

const { ADVERTISEMENT, SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'message']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const advertisementSchema = new Schema(
  {
    ...baseDefinition,

    status: { type: String, enum: LOCALE.DB_TYPE.ADVERTISEMENT.STATUS, default: ADVERTISEMENT.STATUS.SUBMITTED },

    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },

    beginAt: { type: Date, default: Date.now },
    endAt: { type: Date, default: () => addDays(Date.now(), DEFAULTS.ADVERTISEMENT.RUNNING_DAYS) },

    position: { type: String, enum: ['top-banner', 'side-rect', 'modal'], required: true },
    media: { type: String, required: true },
    dimension: { type: String, required: true },
    clickUrl: { type: String, required: true }, // URL redirect link

    categories: [{ type: String, enum: LOCALE.DB_TYPE.ADVERTISEMENT.CATEGORY }],
    targetAge: { min: { type: Number, required: true }, max: { type: Number, required: true } },
    targets: [String],

    frequency: { type: Number, default: 1 }, // limit number of views per user (per device)
    cpv: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpa: { type: Number, default: 0 },

    balance: { type: Number, default: 0 },

    audiences: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    views: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        viewedAt: { type: Date, default: Date.now },
        ip: { type: String, required: true },
        ua: { type: String, required: true },
        amount: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    clicks: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        clickedAt: { type: Date, default: Date.now },
        ip: { type: String, required: true },
        ua: { type: String, required: true },
        amount: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    coupons: [
      {
        code: String,
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        issuedAt: { type: Date, default: Date.now },
        ip: { type: String, required: true },
        ua: { type: String, required: true },
        amount: { type: Number, required: true },
        redeemedAt: Date,
      },
    ],

    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    settledAt: Date,

    updatedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.ADVERTISEMENT },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

advertisementSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Advertisement = model('Advertisement', advertisementSchema);
export type AdvertisementDocument = InferSchemaType<typeof advertisementSchema> & Id;
export default Advertisement;
