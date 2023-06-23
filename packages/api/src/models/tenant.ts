/**
 * Model: Tenant
 * for support multi-tenant, for redirect URL
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

export interface TenantDocument extends BaseDocument {
  apiKey?: string; // available only for satellite self-hosting

  code: string;
  name: Locale;
  school?: string | Types.ObjectId;
  admins: (string | Types.ObjectId)[];
  supports: (string | Types.ObjectId)[];
  counselors: (string | Types.ObjectId)[];
  marshals: (string | Types.ObjectId)[];

  theme?: string; // JSON.stringify (created & consumed by React)

  services: string[];

  htmlUrl?: string;
  logoUrl?: string;
  website: string;
  satelliteUrl?: string; // for satellite sync

  flaggedWords: string[];
  lastSyncedAt?: Date;

  authServices: string[]; // oAuth2 [`${clientId}#${clientSecret}#{redirect}#{select}#${friendKey}`]

  // meta: Map<string, string | number | boolean | Date>;
  meta: Map<string, unknown>;
}

interface TenantModel extends Model<TenantDocument> {
  findByTenantId(
    id: string | Types.ObjectId,
    adminId?: string | Types.ObjectId,
    isAdmin?: boolean,
  ): Promise<TenantDocument & Id>;
  findTutor(): Promise<TenantDocument & Id>;
  findPrimary(): Promise<(TenantDocument & Id) | null>;
  findSatellites(): Promise<(TenantDocument & Id)[]>;
}

const { MSG_ENUM } = LOCALE;
const { SYSTEM } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const tenantSchema = new Schema<TenantDocument>(
  {
    ...baseDefinition,
    apiKey: { type: String, index: true },

    code: { type: String, uppercase: true, unique: true },
    name: localeDefinition,
    school: { type: Schema.Types.ObjectId, ref: 'School' },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    supports: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    counselors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    marshals: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    theme: String,

    services: [String],

    htmlUrl: String,
    logoUrl: String,
    website: String,
    satelliteUrl: String,

    flaggedWords: [String],
    lastSyncedAt: Date,

    authServices: [String],

    meta: { type: Map, of: Schema.Types.Mixed },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

/**
 * Find one Tenant by TenantId with optional adminId check
 */
tenantSchema.static(
  'findByTenantId',
  async (
    id: string | Types.ObjectId,
    adminId?: string | Types.ObjectId,
    isAdmin?: boolean,
  ): Promise<TenantDocument & Id> => {
    const tenant = await Tenant.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
    if (!tenant) throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR };

    if (isAdmin || !adminId || (adminId && idsToString(tenant.admins).includes(adminId.toString()))) return tenant;
    throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
  },
);

/**
 * Find the tutorTenant
 */
// tenantSchema.static('findTutor', async (): Promise<TenantDocument & Id> => {
//   const tutorTenant =
//     (await redisCache.get<TenantDocument & Id>('default-tenant')) ??
//     (await redisCache.set<TenantDocument & Id>(
//       'default-tenant',
//       await Tenant.findOne({ code: 'TUTOR' }).lean(),
//     ));

//   if (!tutorTenant) throw { statusCode: 500, code: MSG_ENUM.TENANT_ERROR };
//   return tutorTenant;
// });
tenantSchema.static('findTutor', async (): Promise<TenantDocument & Id> => {
  const tutorTenant = await Tenant.findOne({ code: 'TUTOR' }).lean();
  if (!tutorTenant) throw { statusCode: 500, code: MSG_ENUM.TENANT_ERROR };
  return tutorTenant;
});

tenantSchema.static('findPrimary', async () =>
  config.mode === 'HUB' ? Tenant.findTutor() : Tenant.findOne({ code: { $ne: 'TUTOR' } }).lean(),
);

/**
 * Find all satellite tenants
 */
// tenantSchema.static(
//   'findSatellites',
//   async (): Promise<(TenantDocument & Id)[]> =>
//     (await redisCache.get('satellite-tenants')) ??
//     redisCache.set(
//       'satellite-tenants',
//       await Tenant.find({ apiKey: { $exists: true }, satelliteUrl: { $exists: true } }).lean(),
//       Math.floor(DEFAULTS.JOB.SLEEP / 1000),
//     ),
// );
tenantSchema.static(
  'findSatellites',
  async (): Promise<(TenantDocument & Id)[]> =>
    Tenant.find({ apiKey: { $exists: true }, satelliteUrl: { $exists: true } }).lean(),
);

tenantSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Tenant = model<TenantDocument, TenantModel>('Tenant', tenantSchema);
export default Tenant;
