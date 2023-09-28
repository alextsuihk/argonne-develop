/**
 * Model: Tenant
 * for support multi-tenant, for redirect URL
 *
 */

import { LOCALE } from '@argonne/common';
import type { Model, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { BaseDocument, Id, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';

export type { Id } from './common';

export interface TenantDocument extends BaseDocument {
  apiKey?: string; // available only for satellite self-hosting

  code: string;
  name: Locale;
  school?: Types.ObjectId;
  admins: Types.ObjectId[];
  supports: Types.ObjectId[];
  counselors: Types.ObjectId[];
  marshals: Types.ObjectId[];

  theme?: string; // JSON.stringify (created & consumed by React)

  services: string[];

  htmlUrl?: string;
  logoUrl?: string;
  website: string;
  satelliteUrl?: string; // for satellite sync

  flaggedWords: string[];
  authServices: string[]; // oAuth2 [`${clientId}#${clientSecret}#{redirect}#{select}#${friendKey}`]

  satelliteIp?: string;
  satelliteVersion?: string;
  seedings: {
    _id: Types.ObjectId;
    ip: string;
    startedAt: Date;
    completedAt?: Date;
    status?: string;
  }[];

  // meta: Map<string, string | number | boolean | Date>;
  meta: Map<string, unknown>;
}

type FindAdminTenants = (userId: string, userTenants: string[]) => Promise<(TenantDocument & Id)[]>;
type FindByTenantId = (
  id: string | Types.ObjectId,
  adminId?: string | Types.ObjectId,
  isAdmin?: boolean,
) => Promise<TenantDocument & Id>;

type SatelliteTenant = TenantDocument & Id & Required<Pick<TenantDocument, 'apiKey' | 'school' | 'satelliteUrl'>>;
type FindSatelliteById = (id: string | Types.ObjectId) => Promise<SatelliteTenant | null>;
type FindSatellites = () => Promise<SatelliteTenant[]>;

interface TenantModel extends Model<TenantDocument> {
  findAdminTenants: FindAdminTenants;
  findByTenantId: FindByTenantId;
  findTutor(): Promise<TenantDocument & Id>;
  findPrimary(): Promise<(TenantDocument & Id) | null>;
  findSatelliteById: FindSatelliteById;
  findSatellites: FindSatellites;
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
    apiKey: String,

    code: { type: String, uppercase: true, unique: true },
    name: localeDefinition,
    school: { type: Schema.Types.ObjectId, ref: 'School' },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
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
    authServices: [String],

    satelliteIp: String,
    satelliteVersion: String,
    seedings: [{ ip: String, startedAt: Date, completedAt: Date, status: String }],

    meta: { type: Map, of: Schema.Types.Mixed },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

/**
 * Find Tenants which userId is admin
 */
const findAdminTenants: FindAdminTenants = async (userId, userTenants) =>
  Tenant.find({ _id: { $in: userTenants }, admins: userId, deletedAt: { $exists: false } }).lean();
tenantSchema.static('findAdminTenants', findAdminTenants);

/**
 * Find one Tenant by TenantId with optional adminId check
 */
const findByTenantId: FindByTenantId = async (id, adminId, isAdmin) => {
  const tenant = await Tenant.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
  if (!tenant) throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR };

  if (isAdmin || !adminId || (adminId && tenant.admins.some(a => a.equals(adminId)))) return tenant;
  throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
};
tenantSchema.static('findByTenantId', findByTenantId);

/**
 * Find the tutorTenant
 */
tenantSchema.static('findTutor', async (): Promise<TenantDocument & Id> => {
  const tutorTenant = await Tenant.findOne({ code: 'TUTOR' }).lean();
  if (!tutorTenant) throw { statusCode: 500, code: MSG_ENUM.TENANT_ERROR };
  return tutorTenant;
});

tenantSchema.static(
  'findPrimary',
  async () => (config.mode === 'HUB' ? Tenant.findTutor() : Tenant.findOne().lean()), // for satellite, null = uninitialized, 1 = initialized
);

/**
 * Find satellite by id
 */
const findSatelliteById: FindSatelliteById = async id =>
  Tenant.findOne({
    _id: id,
    school: { $exists: true },
    apiKey: { $exists: true },
    satelliteUrl: { $exists: true },
    deletedAt: { $exists: false },
  }).lean();

tenantSchema.static('findSatelliteById', findSatelliteById);

/**
 * Find all satellite tenants
 */
const findSatellites: FindSatellites = async () =>
  Tenant.find({
    school: { $exists: true },
    apiKey: { $exists: true },
    satelliteUrl: { $exists: true },
    deletedAt: { $exists: false },
  }).lean();
tenantSchema.static('findSatellites', findSatellites);

tenantSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Tenant = model<TenantDocument, TenantModel>('Tenant', tenantSchema);
export default Tenant;
