/**
 * Model: Publisher
 *
 */

import { LOCALE } from '@argonne/common';
import type { Model, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import { idsToString } from '../utils/helper';
import type { BaseDocument, Id, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export type { Id } from './common';

export interface PublisherDocument extends BaseDocument {
  name: Locale;
  admins: (string | Types.ObjectId)[];
  phones: string[];
  logoUrl?: string;
  website?: string;
}

interface PublisherModel extends Model<PublisherDocument> {
  findByPublisherId(
    id: string | Types.ObjectId,
    adminId?: string | Types.ObjectId,
    isAdmin?: boolean,
  ): Promise<PublisherDocument & Id>;
}

const { MSG_ENUM } = LOCALE;
const { SYSTEM } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['phones', 'website']; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const publisherSchema = new Schema<PublisherDocument>(
  {
    ...baseDefinition,

    name: localeDefinition,
    admins: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    phones: [String],

    logoUrl: String,
    website: String,
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

/**
 * Find one Tenant by TenantId with optional adminId check
 */
publisherSchema.static(
  'findByPublisherId',
  async (id: string | Types.ObjectId, adminId?: string | Types.ObjectId, isAdmin?: boolean) => {
    const publisher = await Publisher.findById(id).lean();
    if (!publisher) throw { statusCode: 400, code: MSG_ENUM.USER_INPUT_ERROR };

    if (isAdmin || (adminId && idsToString(publisher.admins).includes(adminId.toString()))) return publisher;
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  },
);

publisherSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Publisher = model<PublisherDocument, PublisherModel>('Publisher', publisherSchema);
export default Publisher;
