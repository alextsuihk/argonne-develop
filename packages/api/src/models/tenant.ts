/**
 * Model: Tenant
 * for support multi-tenant, for redirect URL
 *
 */

import { LOCALE } from '@argonne/common';
import type { FilterQuery, FlattenMaps, InferSchemaType, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import { Id, stashDefinition, Stashes } from './common';
import { baseDefinition, localeSchema } from './common';

const { MSG_ENUM } = LOCALE;
const { SYSTEM, TENANT } = LOCALE.DB_ENUM;
const { config, DEFAULTS } = configLoader;

const searchFields: string[] = []; // non internationalized fields
const searchLocaleFields: string[] = ['name']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

const tenantSchema = new Schema(
  {
    ...baseDefinition,
    apiKey: { type: String },

    code: { type: String, uppercase: true, unique: true, required: true },
    name: { type: localeSchema, required: true },
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
    authServices: [String], // oAuth2-like [`${clientId}#${clientSecret}#{redirect}#{select}#${friendName}#{url}`]

    satelliteIp: String, // most recent IP
    satelliteVersion: String,
    satelliteStatus: String,
    seedings: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        ip: { type: String, required: true },
        startedAt: { type: Date, required: true },
        completedAt: Date,
        result: String,
      },
    ],

    stashes: [stashDefinition],

    meta: { type: Map, of: String },
  },
  {
    ...DEFAULTS.MONGOOSE.SCHEMA_OPTS,

    statics: {
      async findAdminTenants(userId: Types.ObjectId, userTenants: string[]) {
        return this.find({ _id: { $in: userTenants }, admins: userId, deletedAt: { $exists: false } }).lean();
      },

      async findPrimary() {
        return config.mode === 'HUB' ? this.findOne({ code: 'TUTOR' }).lean() : this.findOne().lean();
      },

      async findByTenantId(id: string | Types.ObjectId, adminId?: Types.ObjectId, isAdmin?: boolean) {
        const tenant = await this.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
        if (!tenant) throw { statusCode: 400, code: MSG_ENUM.TENANT_ERROR };

        if (isAdmin || !adminId || (adminId && tenant.admins.some(a => a.equals(adminId)))) return tenant;
        throw { statusCode: 403, code: MSG_ENUM.UNAUTHORIZED_OPERATION };
      },

      async findTutor() {
        const tutorTenant = await this.findOne({ code: 'TUTOR' }).lean();
        if (tutorTenant) return tutorTenant;
        throw { statusCode: 500, code: MSG_ENUM.TENANT_ERROR };
      },
    },
  },
);

tenantSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const Tenant = model('Tenant', tenantSchema);
export type TenantDocument = FlattenMaps<Omit<InferSchemaType<typeof tenantSchema>, 'seedings' | 'stashes'>> &
  Id &
  Stashes & {
    seedings: { _id: Types.ObjectId; ip: string; startedAt: Date; completedAt?: Date | null; result?: string | null }[];
  };

export default Tenant;

/**
 * findSatelliteTenantById() & findSatelliteTenants()
 * break out from tenantSchema because of requirement of proper return type
 */
type ReadyTo = 'queue' | 'sync';
type SatelliteTenant = Omit<TenantDocument, 'school' | 'apiKey' | 'satelliteUrl'> & {
  school: Types.ObjectId;
  apiKey: string;
  satelliteUrl: string;
};
const filter = (readyTo?: ReadyTo): FilterQuery<TenantDocument> => ({
  school: { $exists: true },
  deletedAt: { $exists: false },

  ...(readyTo === 'queue' && {
    apiKey: { $exists: true },
    satelliteUrl: { $exists: true },
    satelliteStatus: { $in: [TENANT.SATELLITE_STATUS.INITIALIZING, TENANT.SATELLITE_STATUS.READY] },
  }),
  ...(readyTo === 'sync' && {
    apiKey: { $exists: true },
    satelliteUrl: { $exists: true },
    satelliteStatus: TENANT.SATELLITE_STATUS.READY,
  }),
});

export const findSatelliteTenantById = async (
  id: string | Types.ObjectId,
  readyTo?: ReadyTo,
): Promise<SatelliteTenant | null> => Tenant.findOne({ _id: id, ...filter(readyTo) }).lean();

export const findSatelliteTenants = async (readyTo?: ReadyTo): Promise<SatelliteTenant[]> =>
  Tenant.find(filter(readyTo)).lean();
