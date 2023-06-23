/**
 * (default) Constants Setting
 *
 * Note: using TS file to support comment
 */

import { LOCALE } from '@argonne/common';

const { SYSTEM } = LOCALE.DB_ENUM;

const DOMAIN = 'inspire.hk';

export default {
  ARGONNE_URL: `https://school.${DOMAIN}`,
  DOMAIN,
  AMOUNT_DECIMAL_PLACE: 2,

  ANNOUNCEMENT: {
    RUNNING_DAYS: 14,
  },

  ADVERTISEMENT: {
    RUNNING_DAYS: 14,
  },

  AUTH: {
    LOGIN_TOKEN_EXPIRES_IN: 60 * 15, // expires in 15mins
    EMAIL_CONFIRM_EXPIRES_IN: 60 * 60 * 24, // expires in 1 day
    MAX_LOGIN: 5, // max simultaneous logins (refreshToken)  per user,
    PASSWORD_RESET_EXPIRES_IN: 60 * 60, // expires in 1 hour
    SAME_IP_LOGIN_ONLY: true, // all devices MUST be accessed from the same IP (WAN) address when login
  },

  BANNED_WORDS: ['屌', '𨳊', '仆街', '老母', '冚家剷', '攔坦', 'ass', 'fxxx', 'fuck', 'hell', 'shit'],

  BYGONE_DAYS: 365 * 3,

  CONTACT: {
    TOKEN_EXPIRES_IN: 60 * 60 * 24, // expires in a day
  },
  CREDITABILITY: {
    MIN: 0,
    MAX: 10,
    CREATE_TAG: Number(process.env.REACT_APP_CREDITABILITY_CREATE_TAG || 8),
    UPDATE_TAG: Number(process.env.REACT_APP_CREDITABILITY_UPDATE_TAG || 9),
    REMOVE_TAG: Number(process.env.REACT_APP_CREDITABILITY_REMOVE_TAG || 10),
    ATTACH_TAG: Number(process.env.REACT_APP_CREDITABILITY_ATTACH_TAG || 5),
    DETACH_TAG: Number(process.env.REACT_APP_CREDITABILITY_DETACH_TAG || 7),
  },

  JOB: { RETRY: 3, TIMEOUT: 1000 * 60, SLEEP: 1000 * 60 * 5 },

  JWT: {
    EXPIRES: {
      ACCESS: 60 * 15, // 15mins access token
      REFRESH: 60 * 60 * 24 * 7, // number of days (in seconds)
    },
  },

  LOCALE: SYSTEM.LOCALE.enUS,

  LOGGER_URL: 'https://service.alextsui.net/logger',

  MONGOOSE: {
    // remove documents after expiring
    EXPIRES: {
      ADVERTISEMENT: '400d',
      ANNOUNCEMENT: '90d',
      APPROVAL: '90d',
      GIFT_CARD: '120d',
      JOB: '90d',
      LOG: '400d',
      OPINION: '30d',
      REDIRECT: '5d',
      REFERRAL: '30d',
      TUTOR_RANKING: '180d',
      USER: '400d',
    },
    SCHEMA_OPTS: {
      timestamps: true, // add createdAt & updatedAt fields by default
      toJSON: {
        // transform: function (_: unknown, ret: { _id?: unknown }): void {
        //   delete ret._id; // remove _id when returning
        // },
        getters: true,
        setters: true,
        virtuals: false, // no need to send 'id'
      },
      toObject: {
        setters: true,
        getters: true,
        virtuals: false,
      },
      // versionKey: false, // remove __v (need to keep it for discriminatorKey)
    },
  },

  OAUTH2: {
    FACEBOOK: {
      // TODO: https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/
      SCOPES: ['email', 'publish_action'],
    },
    GITHUB: {
      // TODO: https://docs.github.com/en/free-pro-team@latest/developers/apps/creatorizing-oauth-apps
      SCOPE: 'user',
    },

    GOOGLE: {
      SCOPE: 'profile',
    },
    TWITTER: {
      // TODO: https://developer.twitter.com/en/docs/authentication/oauth-1-0a/obtaining-user-access-tokens
    },
  },

  PAGINATION: 20, // limit 20 documents in pagination

  QUESTION: {
    CLOSE_DAYS: 14,
  },

  REDIRECT: {
    EXPIRES: 60 * 60 * 24, // in seconds (tmp Login)
  },

  REDIS: {
    EXPIRES: {
      // default record expiration time in seconds
      // default: 60, // TODO: just for testing
      DEFAULT: 3600,
      // ONE_MINUTE: 60, // in minute
      // ONE_HOUR: 3600,
      // ONE_DAY: 25200,
    },
    PREFIX: 'anl-', // prepend prefix to all keys
  },

  STORAGE: {
    PRESIGNED_URL_PUT_EXPIRY: 10, // in seconds
    PRESIGNED_URL_GET_EXPIRY: 60 * 5, // in seconds
    // REPORT_EXPIRY: 60 * 60 * 24 * 7, // report expires in seconds
  },

  TENANT: {
    TOKEN_EXPIRES_IN: 60 * 60 * 24 * 7, // expires in 7 day
  },

  DARK_MODE: false,
  TIMEZONE: 'Asia/Hong_Kong',

  USER: {
    FLAGS: [],
    IDENTIFIABLE_EXPIRY: 3, // IDENTIFIABLE expires after 3 years
    SUSPENSION_DAY: 7,
    WEBPUSH: {},
  },

  // TODO: move this table to ad-dispatch
  // ADVERTISEMENT: {
  //   MEDIA: { VIDEO: {}, IMAGE: {} },
  //   DIMENSION: {
  //     // Reference: https://support.google.com/google-ads/answer/7031480?hl=en
  //     // m: mobile, c: computer, b: both
  //     b250x250: { enabled: true, width: 250, height: 250 },
  //     m300x250: { enabled: true, width: 300, height: 250 },
  //     m320x50: { enabled: true, width: 320, height: 50 },
  //     m320x100: { enabled: true, width: 320, height: 100 },
  //     m200x200: { enabled: true, width: 200, height: 200 },
  //     c300x250: { enabled: true, width: 300, height: 250 },
  //     c336x280: { enabled: true, width: 336, height: 280 },
  //     c728x90: { enabled: false, width: 728, height: 90 },
  //     c300x600: { enabled: true, width: 300, height: 600 },
  //     c160x600: { enabled: false, width: 160, height: 600 },
  //     c970x90: { enabled: false, width: 970, height: 90 },
  //     c468x60: { enabled: false, width: 468, height: 60 },
  //     c200x200: { enabled: false, width: 200, height: 200 },
  //   },
  // },
};
