/**
 * Model: User
 *
 */

import { LOCALE } from '@argonne/common';
import bcrypt from 'bcryptjs';
import { subDays } from 'date-fns';
import type { Document, FilterQuery, Model, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import redisCache from '../redis';
import { idsToString } from '../utils/helper';
import type { BaseDocument, Id, Locale } from './common';
import { baseDefinition, localeDefinition } from './common';
import type { UserExtra } from './user-extra';
import { userExtraDefinition } from './user-extra';

export type { Id } from './common';

// extends BaseDocument & app-specific user profile
export interface UserDocument extends BaseDocument, UserExtra {
  tenants: (string | Types.ObjectId)[];

  status: (typeof LOCALE.DB_TYPE.USER.STATUS)[number];
  name: string;
  formalName?: Partial<Locale>;

  emails: string[];

  password: string;
  oAuth2s: string[]; // format `GOOGLE#${subId}`

  avatarUrl?: string;
  mobile?: string; // unverified mobile, startsWith "#", #+852 12345678
  whatsapp?: string; // unverified statsWith "#"
  verificationTokens: string[]; // format `${code}#${type}#${expireAt.getTime()}`; type = 'mobile' | 'whatsapp'

  contacts: {
    user: string | Types.ObjectId;
    name?: string;
  }[];
  isOnline: boolean;
  networkStatus?: string;

  timezone: string;
  // locale: typeof LOCALE.DB_TYPE.SYSTEM.LOCALE[number];
  locale: string;

  darkMode: boolean;
  theme?: string; // JSON.stringify (created & consumed by React)

  //TODO: each apiKey ONLY support a single scope
  apiKeys: { value: string; scope: string; note?: string; expireAt: Date }[]; // TODO: update docs.md
  roles: string[];
  features: string[];
  scopes: string[];

  yob: number;
  dob: Date;

  coin: number;
  virtualCoin: number;
  balanceAuditedAt: Date;

  paymentMethods: {
    _id?: string | Types.ObjectId;
    currency: string;
    type: string;
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

  supervisors: (string | Types.ObjectId)[];
  staffs: (string | Types.ObjectId)[];

  violations: {
    createdAt: Date;
    reason: string;
    link: string; // e.g. /chatGroups/${chatGroupId}/${chatId}/${contentId}, /questions/${questionId}/${contentId}
  }[];
  suspension?: Date;
  expoPushTokens: string[];

  creditability: number;

  estimate: Map<string, unknown>;
  identifiedAt?: Date;
}

type SystemAccountIds = {
  adminIds: string[];
  accountId: string;
  accountWithheldId: string;
  robotIds: string[];
  alexId: string;
};

interface UserModel extends Model<UserDocument> {
  findOneActive(filter: FilterQuery<UserDocument & Id>, select?: string): Promise<(UserDocument & Id) | null>;
  findSystemAccountIds(): Promise<SystemAccountIds>;
  genValidPassword(prefix?: string): string;
  nullifyClass(): Promise<void>;
}

const { MSG_ENUM } = LOCALE;
const { SYSTEM, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

const searchFields: string[] = ['_id', 'name', 'emails', 'mobile', 'whatsapp', 'tenant']; // non internationalized fields
const searchLocaleFields: string[] = ['formalName']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

export const userAdminSelect = '-__v -password -tags -idx -verificationTokens -apiKeys.value -estimate -contacts';
export const userNormalSelect = `${userAdminSelect} -remarks -deletedAt`;
export const userLoginSelect = `${userNormalSelect.replace('-password ', '')}`; // get password
export const userTenantSelect =
  '_id flags tenants status name formalName emails avatarUrl studentIds schoolHistories remarks createdAt updatedAt deletedAt';
export const userBaseSelect = '_id name emails avatarUrl schoolHistories';

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
    mobile: String,
    whatsapp: String,
    verificationTokens: [String],

    contacts: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
      },
    ],
    isOnline: Boolean,
    networkStatus: String,

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

    paymentMethods: [
      { currency: String, type: String, bank: String, account: String, payable: Boolean, receivable: Boolean },
    ],

    preference: String, // JSON.stringify
    subscriptions: [
      {
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
    suspension: Date,

    expoPushTokens: [String],
    creditability: { type: Number, default: 0 },

    estimate: { type: Map, of: Schema.Types.Mixed },
    identifiedAt: Date,

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
userSchema.static('findOneActive', async (filter: FilterQuery<UserDocument>, select?: string) =>
  User.findOne({ ...filter, status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } }, select).lean(),
);

userSchema.static('findSystemAccountIds', async (): Promise<SystemAccountIds> => {
  const [cachedAdminIds, cachedAccountId, cachedAccountWithheldId, cachedRobotIds, cachedAlexId] = await Promise.all([
    redisCache.get('adminIds'),
    redisCache.get('accountId'),
    redisCache.get('accountWithheldId'),
    redisCache.get('robotIds'),
    redisCache.get('alexId'),
  ]);

  if (
    cachedAdminIds &&
    typeof cachedAdminIds === 'string' &&
    cachedAccountId &&
    typeof cachedAccountId === 'string' &&
    cachedAccountWithheldId &&
    typeof cachedAccountWithheldId === 'string' &&
    cachedRobotIds &&
    typeof cachedRobotIds === 'string' &&
    cachedAlexId &&
    typeof cachedAlexId === 'string'
  )
    return {
      adminIds: cachedAdminIds.split(','),
      accountId: cachedAccountId,
      accountWithheldId: cachedAccountWithheldId,
      robotIds: cachedRobotIds.split(','),
      alexId: cachedAlexId,
    };

  // no cached values
  const [admins, account, accountWithheld, robots, alex] = await Promise.all([
    User.find({ roles: USER.ROLE.ADMIN }).lean(),
    User.findOne({ status: USER.STATUS.ACCOUNT, name: 'Account' }).lean(),
    User.findOne({ status: USER.STATUS.ACCOUNT, name: 'Withheld Account' }).lean(),
    User.find({ status: USER.STATUS.BOT }).lean(),
    User.findOneActive({ emails: 'alex@alextsui.net' }),
  ]);

  if (!admins.length || !account || !accountWithheld || !robots.length || !alex)
    throw { statusCode: 500, code: MSG_ENUM.GENERAL_ERROR };

  const adminIds = idsToString(admins);
  const accountId = account._id.toString();
  const accountWithheldId = accountWithheld._id.toString();
  const robotIds = idsToString(robots);
  const alexId = alex._id.toString();

  await Promise.all([
    redisCache.set('adminIds', adminIds.join(',')),
    redisCache.set('accountId', accountId),
    redisCache.set('accountWithheldId', accountWithheldId),
    redisCache.set('robotIds', robotIds.join(',')),
    redisCache.set('alexId', alexId),
  ]);

  return { adminIds, accountId, accountWithheldId, robotIds, alexId };
});

/**
 * Generate a Valid Password meeting ../validators/auth.ts:password
 *
 * note: primarily for seed, factory & jest
 */
userSchema.static('genValidPassword', (prefix = 'A#a1'): string => `${prefix}${Math.random().toString(36).slice(-6)}`);

/**
 * Nullify user.class at the end of a school year
 */
userSchema.static('nullifyClass', async (): Promise<void> => {
  await User.updateMany(
    { schoolClass: { $exists: true }, annualUpdatedAt: { $lte: subDays(new Date(), 365) } },
    { $unset: { schoolClass: '' }, $push: { remarks: { t: new Date(), m: 'nullify-schoolClass' } } },
  );
});

userSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const User = model<UserDocument, UserModel>('User', userSchema);
export default User;
