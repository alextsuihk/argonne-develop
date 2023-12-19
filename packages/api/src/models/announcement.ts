/**
 * Model: Announcement
 *
 */

import { LOCALE } from '@argonne/common';
import { addDays } from 'date-fns';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id, Remarks } from './common';
import { baseDefinition } from './common';

const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['title', 'message']; // non internationalized fields
const searchLocaleFields: string[] = []; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const announcementSchema = new Schema(
  {
    ...baseDefinition,

    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    beginAt: { type: Date, default: Date.now },
    endAt: {
      type: Date,
      default: () => addDays(Date.now(), DEFAULTS.ANNOUNCEMENT.RUNNING_DAYS),
      expires: DEFAULTS.MONGOOSE.EXPIRES.ANNOUNCEMENT,
    },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

announcementSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Announcement = model('Announcement', announcementSchema);
export type AnnouncementDocument = Omit<InferSchemaType<typeof announcementSchema>, 'remarks'> & Id & Remarks;
export default Announcement;
