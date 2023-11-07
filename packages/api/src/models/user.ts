/**
 * Model: User
 *
 */

import { LOCALE } from '@argonne/common';
import bcrypt from 'bcryptjs';
import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import redisCache from '../redis';
import { mongoId } from '../utils/helper';
import type { Id } from './common';
import { baseDefinition, localeSchema } from './common';
import { userExtraDefinition } from './user-extra';

const { SYSTEM, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

export const activeCond = { status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } } as const;

const searchFields: string[] = ['_id', 'name', 'emails', 'messengers', 'tenant']; // non internationalized fields
const searchLocaleFields: string[] = ['formalName']; // internationalized fields
export const searchableFields = [
  ...searchFields,
  ...searchLocaleFields.map(field => Object.keys(SYSTEM.LOCALE).map(locale => `${field}.${locale}`)).flat(),
];

export const userNormalSelect = `-__v -password -tags -idx -contacts -apiKeys -isOnline -remarks -deletedAt`;
export const userLoginSelect = `${userNormalSelect.replace('-password ', '')}`; // get password
export const userTenantSelect =
  '_id flags tenants status name formalName emails features avatarUrl violations suspendUtil identifiedAt studentIds schoolHistories remarks createdAt updatedAt deletedAt';
export const userAuthServiceBaseSelect = '_id name emails avatarUrl schoolHistories';

const userSchema = new Schema(
  {
    ...baseDefinition,

    tenants: [{ type: Schema.Types.ObjectId, ref: 'Tenant', index: true }],

    status: { type: String, enum: LOCALE.DB_TYPE.USER.STATUS, default: USER.STATUS.ACTIVE },

    name: { type: String, required: true },
    formalName: { type: localeSchema }, // optional

    emails: [{ type: String, trim: true, index: true }],

    password: { type: String, required: true },
    oAuth2s: [{ type: String, index: true }], // format `GOOGLE#${subId}`

    avatarUrl: String,
    messengers: [String], // `WHATSAPP#+85212345678` uppercase for verified messenger, 'mobile#+85298765432' for unverified

    contacts: [
      {
        _id: false,
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: String,
        updatedAt: { type: Date, required: true },
      },
    ],
    isOnline: Boolean,
    availability: String,

    timezone: { type: String, default: DEFAULTS.USER.TIMEZONE },
    locale: { type: String, default: DEFAULTS.USER.LOCALE },

    darkMode: { type: Boolean, default: DEFAULTS.USER.DARK_MODE }, // derived from material-ui theme
    theme: String, // JSON.stringify (created & consumed by React)

    apiKeys: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        token: { type: String, required: true },
        scope: { type: String, required: true },
        note: String,
        expireAt: { type: Date, required: true },
      },
    ],
    roles: [{ type: String, enum: LOCALE.DB_TYPE.USER.ROLE }],
    features: [String], // debug, experimental [], etc

    yob: Number, // year of birth
    dob: Date, // date of birth

    coin: { type: Number, get: (v: number) => Math.round(v), set: (v: number) => Math.round(v), default: 0 }, // useable amount
    virtualCoin: { type: Number, get: (v: number) => Math.round(v), set: (v: number) => Math.round(v), default: 0 }, // free coupon (non cash convertible)
    balanceAuditedAt: { type: Date, default: Date.now },

    paymentMethods: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        currency: { type: String, required: true },
        bank: String,
        account: { type: String, required: true },
        payable: { type: Boolean, required: true },
        receivable: { type: Boolean, required: true },
      },
    ],

    preference: String, // JSON.stringify (only clients understand the format)

    pushSubscriptions: [
      {
        _id: false,
        endpoint: { type: String, required: true },
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    ],

    supervisors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    staffs: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    violations: [
      {
        createdAt: { type: Date, default: Date.now },
        reason: { type: String, required: true },
        link: { type: String, required: true }, // e.g. /chatGroups/${chatGroupId}/${chatId}/${contentId}, /questions/${questionId}/${contentId}
      },
    ],
    suspendUtil: Date,

    expoPushTokens: [String],
    creditability: { type: Number, default: 0 },

    identifiedAt: Date,

    stashes: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        title: { type: String, required: true },
        secret: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],

    ...userExtraDefinition,
    deletedAt: { type: Date, expires: DEFAULTS.MONGOOSE.EXPIRES.USER },
  },
  {
    ...DEFAULTS.MONGOOSE.SCHEMA_OPTS,

    statics: {
      async findSystemAccountIds() {
        const cachedSystemAccountIds = await redisCache.get('systemAccountIds');

        if (typeof cachedSystemAccountIds === 'string') {
          const [systemId, adminIds, accountId, accountWithheldId, robotIds, alexId] =
            cachedSystemAccountIds.split('#');

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
          this.findOne({ status: USER.STATUS.SYSTEM, name: 'System' }).lean(),
          this.find({ roles: USER.ROLE.ADMIN }).lean(),
          this.findOne({ status: USER.STATUS.ACCOUNT, name: 'Account' }).lean(),
          this.findOne({ status: USER.STATUS.ACCOUNT, name: 'Withheld Account' }).lean(),
          this.find({ status: USER.STATUS.BOT }).lean(),
          this.findOne({ emails: 'alex@alextsui.net' }),
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
      },

      genValidPassword(prefix = 'A#a1') {
        return `${prefix}${Math.random().toString(36).slice(-6)}`;
      },
    },
  },
);

/**
 * Virtual Property
 */
// userSchema.virtual('email').get(function () {
//   return this.emails[0];
// });

/**
 * Middleware: encrypt password whenever password is updated
 */
// userSchema.pre('save', async function (this: UserDocument & Document<UserDocument>) {
userSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) this.password = await bcrypt.hash(this.password, 7);
});

userSchema.index(Object.fromEntries(searchableFields.map(f => [f, 'text'])), { name: 'Search' }); // text search
const User = model('User', userSchema);
export type UserDocument = InferSchemaType<typeof userSchema> & Id;
export default User;
