/**
 * Model: Announcement
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

export interface AnnouncementDocument extends BaseDocument {
  tenant?: Types.ObjectId;
  title: string;
  message: string;
  beginAt: Date;
  endAt: Date;
}

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'message']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const announcementSchema = new Schema<AnnouncementDocument>(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    title: String,
    message: String,
    beginAt: { type: Date, default: Date.now },
    endAt: {
      type: Date,
      default: addDays(Date.now(), DEFAULTS.ANNOUNCEMENT.RUNNING_DAYS),
      expires: DEFAULTS.MONGOOSE.EXPIRES.ANNOUNCEMENT,
    },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

announcementSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Announcement = model<AnnouncementDocument>('Announcement', announcementSchema);
export default Announcement;
