/**
 * Model: User
 *
 */

import { LOCALE } from '@argonne/common';
import bcrypt from 'bcryptjs';
import type { Document, FilterQuery, Model, Types } from 'mongoose';
import { model, Schema } from 'mongoose';
import { PushSubscription } from 'web-push';

import configLoader from '../config/config-loader';
import redisCache from '../redis';
import { mongoId } from '../utils/helper';
import type { BaseDocument, Id, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';
import type { UserExtra } from './user-extra';
import { userExtraDefinition } from './user-extra';

export type { Id } from './common';

// extends BaseDocument & app-specific user profile
export interface UserDocument extends BaseDocument, UserExtra {
  tenants: Types.ObjectId[];

  status: (typeof LOCALE.DB_TYPE.USER.STATUS)[number];
  name: string;
  formalName?: Partial<Locale>;

  emails: string[];

  password: string;
  oAuth2s: string[]; // format `GOOGLE#${subId}`

  avatarUrl?: string;
  messengers: string[]; // `WHATSAPP#+85212345678` uppercase for verified messenger, 'mobile#+852xxxxyyyy' for unverified

  contacts: {
    user: Types.ObjectId;
    name?: string;
    updatedAt: Date;
  }[];
  isOnline?: boolean;
  availability?: string;

  timezone: string;
  // locale: typeof LOCALE.DB_TYPE.SYSTEM.LOCALE[number];
  locale: string;

  darkMode: boolean;
  theme?: string; // JSON.stringify (created & consumed by React)

  apiKeys: { _id: Types.ObjectId; value: string; scope: string; note?: string; expireAt: Date }[];
  roles: string[];
  features: string[];
  scopes: string[];

  yob: number;
  dob: Date;

  coin: number;
  virtualCoin: number;
  balanceAuditedAt: Date;

  paymentMethods: {
    _id: Types.ObjectId;
    currency: string;
    bank?: string;
    account: string;
    payable: boolean;
    receivable: boolean;
  }[];

  preference?: string; // JSON.stringify
  subscriptions: {
    socketId: string;
    token: string;
    subscription: PushSubscription;
    enabled: boolean;
    permission: (typeof LOCALE.DB_TYPE.USER.WEBPUSH.PERMISSION)[number];
    ip: string;
    ua: string;
  }[];

  interests: string[];

  supervisors: Types.ObjectId[];
  staffs: Types.ObjectId[];

  violations: {
    _id: Types.ObjectId;
    createdAt: Date;
    reason: string;
    link: string; // e.g. /chatGroups/${chatGroupId}/${chatId}/${contentId}, /questions/${questionId}/${contentId}
  }[];
  suspendUtil?: Date;
  expoPushTokens: string[];

  creditability: number;

  estimate: Map<string, unknown>;
  identifiedAt?: Date;

  stashes: string[]; // `${tag}#${url}`
}

type SystemAccountIds = {
  systemId: Types.ObjectId;
  adminIds: Types.ObjectId[];
  accountId?: Types.ObjectId; // could be undefined to satellite
  accountWithheldId?: Types.ObjectId;
  robotIds: Types.ObjectId[];
  alexId?: Types.ObjectId;
};

type FindOneActive = (filter: FilterQuery<UserDocument & Id>, select?: string) => Promise<(UserDocument & Id) | null>;
interface UserModel extends Model<UserDocument> {
  findOneActive: FindOneActive;
  findSystemAccountIds(): Promise<SystemAccountIds>;
  genValidPassword(prefix?: string): string;
}

const { SYSTEM, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['_id', 'name', 'emails', 'messengers', 'tenant']; // non internationalized fields
const searchLocaleFields: string[] = ['formalName']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

export const userNormalSelect = `-__v -password -tags -idx -estimate -contacts -isOnline -remarks -deletedAt`;
export const userLoginSelect = `${userNormalSelect.replace('-password ', '')}`; // get password
export const userTenantSelect =
  '_id flags tenants status name formalName emails features avatarUrl violations suspendUtil identifiedAt studentIds schoolHistories remarks createdAt updatedAt deletedAt';
export const userAuthServiceBaseSelect = '_id name emails avatarUrl schoolHistories';

const userSchema = new Schema<UserDocument>(
  {
    ...baseDefinition,

    tenants: [{ type: Schema.Types.ObjectId, ref: 'Tenant', index: true }],

    status: { type: String, default: USER.STATUS.ACTIVE },

    name: String,
    formalName: localeDefinition,

    emails: [{ type: String, trim: true, index: true }],

    password: String,
    oAuth2s: [{ type: String, index: true }],

    avatarUrl: String,
    messengers: [String],

    contacts: [{ _id: false, user: { type: Schema.Types.ObjectId, ref: 'User' }, name: String, updatedAt: Date }],
    isOnline: Boolean,
    availability: String,

    timezone: { type: String, default: DEFAULTS.TIMEZONE },
    locale: { type: String, default: DEFAULTS.LOCALE },

    // derived from material-ui theme
    darkMode: { type: Boolean, default: DEFAULTS.DARK_MODE },
    theme: String,

    apiKeys: [{ value: String, scope: String, note: String, expireAt: Date }],
    roles: [String],
    features: [String], // debug, experimental [], etc
    scopes: [String], // debug, experimental [], etc

    yob: Number, // year of birth
    dob: Date, // date of birth

    coin: { type: Number, get: (v: number) => Math.round(v), set: (v: number) => Math.round(v), default: 0 }, // useable amount
    virtualCoin: { type: Number, get: (v: number) => Math.round(v), set: (v: number) => Math.round(v), default: 0 }, // free coupon (non cash convertible)
    balanceAuditedAt: { type: Date, default: Date.now },

    paymentMethods: [{ currency: String, bank: String, account: String, payable: Boolean, receivable: Boolean }],

    preference: String, // JSON.stringify
    subscriptions: [
      {
        _id: false,
        socketId: String, // socketId
        token: String, // most recent token
        subscription: Schema.Types.Mixed, // webpush subscription object
        enabled: { type: Boolean, default: true },
        permission: { type: String, default: USER.WEBPUSH.PERMISSION.DEFAULT },
        ip: String,
        ua: String,
      },
    ],

    interests: [String],

    supervisors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    staffs: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    violations: [
      {
        createdAt: { type: Date, default: Date.now },
        reason: String,
        link: String,
      },
    ],
    suspendUtil: Date,

    expoPushTokens: [String],
    creditability: { type: Number, default: 0 },

    estimate: { type: Map, of: Schema.Types.Mixed },
    identifiedAt: Date,

    stashes: [String],

    ...userExtraDefinition,
    updatedAt: Date, // no need to index
    deletedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.USER },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

/**
 * Virtual Property
 */
// userSchema.virtual('email').get(function (this: UserDocument) {
//   return this.emails[0];
// });

/**
 * Middleware: encrypt password whenever password is updated
 */
userSchema.pre('save', async function (this: UserDocument & Document<UserDocument>) {
  if (this.isModified('password') && this.password) this.password = await bcrypt.hash(this.password, 7);
});

/**
 *
 */
const findOneActive: FindOneActive = async (filter: FilterQuery<UserDocument>, select?: string) =>
  User.findOne({ ...filter, status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } }, select).lean();
userSchema.static('findOneActive', findOneActive);

userSchema.static('findSystemAccountIds', async (): Promise<SystemAccountIds> => {
  const cachedSystemAccountIds = await redisCache.get('systemAccountIds');

  if (typeof cachedSystemAccountIds === 'string') {
    const [systemId, adminIds, accountId, accountWithheldId, robotIds, alexId] = cachedSystemAccountIds.split('#');

    if (systemId)
      return {
        systemId: mongoId(systemId),
        adminIds: adminIds ? adminIds.split(',').map(u => mongoId(u)) : [],
        ...(accountId && { accountId: mongoId(accountId) }),
        ...(accountWithheldId && { accountWithheldId: mongoId(accountWithheldId) }),
        robotIds: robotIds ? robotIds.split(',').map(u => mongoId(u)) : [],
        ...(alexId && { alexId: mongoId(alexId) }),
      };
  }

  // no cached values
  const [system, admins, account, accountWithheld, robots, alex] = await Promise.all([
    User.findOne({ status: USER.STATUS.SYSTEM, name: 'System' }).lean(),
    User.find({ roles: USER.ROLE.ADMIN }).lean(),
    User.findOne({ status: USER.STATUS.ACCOUNT, name: 'Account' }).lean(),
    User.findOne({ status: USER.STATUS.ACCOUNT, name: 'Withheld Account' }).lean(),
    User.find({ status: USER.STATUS.BOT }).lean(),
    User.findOneActive({ emails: 'alex@alextsui.net' }),
  ]);

  const systemId = system?._id ?? mongoId();
  const adminIds = admins.map(u => u._id);
  const accountId = account?._id;
  const accountWithheldId = accountWithheld?._id;
  const robotIds = robots.map(u => u._id);
  const alexId = alex?._id;

  await redisCache.set(
    'systemAccountIds',
    [systemId, adminIds.join(','), accountId, accountWithheldId, robotIds.join(','), alexId].join('#'), // join() automatically convert toString()
  );

  return { systemId, adminIds, accountId, accountWithheldId, robotIds, alexId };
});

/**
 * Generate a Valid Password meeting ../validators/auth.ts:password
 *
 * note: primarily for seed, factory & jest
 */
userSchema.static('genValidPassword', (prefix = 'A#a1'): string => `${prefix}${Math.random().toString(36).slice(-6)}`);

userSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const User = model<UserDocument, UserModel>('User', userSchema);
export default User;
