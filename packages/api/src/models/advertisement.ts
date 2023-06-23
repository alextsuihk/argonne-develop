/**
 * Model: Advertisement
 *
 * ! Note: All amounts are rounded to 1/1000 of a dollar
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';
import type { Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument } from './common';
import { baseDefinition } from './common';

export type { Id } from './common';

//! TODO: add calculatedPriority
// const probability = balance / Math.ceil((endAt - beginAt)/1000/60*60*24) / (0.9 * cpv + 0.1 * cpc) / audiences / dailyLimit * 100
// probability > 100: too much budget, not enough audiences
// probability = 100: should be about to push $dailyLimit times to each push targetUser
// probability = 50%: targetUser would have 50% chance to view ${dailyLimit} times per day
// The optimal probability should be 100%

export interface AdvertisementDocument extends BaseDocument {
  status: (typeof LOCALE.DB_TYPE.ADVERTISEMENT.STATUS)[number];

  owner: string | Types.ObjectId;
  title: string;

  beginAt: Date;
  endAt: Date;

  position: 'top-banner' | 'side-rect' | 'modal';
  media: string;
  dimension: string;
  clickUrl: string; // either redirect to another URL, or return a minio url (PDF or PNG, MP4)
  frequency: number;

  categories: (typeof LOCALE.DB_TYPE.ADVERTISEMENT.CATEGORY)[number][];
  targetAge: { min: number; max: number };
  targets: string[];

  dailyLimit: number;
  cpv: number;
  cpc: number;
  cpa: number;

  balance: number;

  audiences: (string | Types.ObjectId)[];

  // TODO: break out views/clicks/coupon to AdvertisementEvent (generic)
  views: {
    user: string | Types.ObjectId;
    viewedAt: Date;
    ip: string;
    ua: string;
    amount: number;
    createdAt: Date;
  }[];

  clicks: {
    user: string | Types.ObjectId;
    clickedAt: Date;
    ip: string;
    ua: string;
    amount: number;
    createdAt: Date;
  }[];

  coupons: {
    code: string;
    user: string | Types.ObjectId;
    issuedAt: Date;
    expireAt: Date;
    ip: string;
    ua: string;
    amount: number;
    redeemedAt: Date;
  }[];

  approvedAt: Date;
  approvedBy: string | Types.ObjectId;
  settledAt: Date;
}

const { ADVERTISEMENT, SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'message']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const advertisementSchema = new Schema<AdvertisementDocument>(
  {
    ...baseDefinition,

    status: { type: String, default: ADVERTISEMENT.STATUS.SUBMITTED },

    owner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: String,

    beginAt: { type: Date, default: Date.now },
    endAt: { type: Date, default: addDays(Date.now(), DEFAULTS.ADVERTISEMENT.RUNNING_DAYS) },

    position: String,
    media: String,
    dimension: String,
    clickUrl: String, // URL redirect link
    frequency: Number,

    categories: [String],
    targetAge: { min: Number, max: Number },
    targets: [String],

    dailyLimit: { type: Number, default: 1 }, // limit number of views per user (per device)
    cpv: Number,
    cpc: Number,
    cpa: Number,

    balance: { type: Number, default: 0 },

    audiences: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    views: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
        ip: String,
        ua: String,
        amount: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    clicks: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        clickedAt: { type: Date, default: Date.now },
        ip: String,
        ua: String,
        amount: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    coupons: [
      {
        code: String,
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        issuedAt: { type: Date, default: Date.now },
        ip: String,
        ua: String,
        amount: Number,
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
const Advertisement = model<AdvertisementDocument>('Advertisement', advertisementSchema);
export default Advertisement;
