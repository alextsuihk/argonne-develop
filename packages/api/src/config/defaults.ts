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

  AXIOS_TIMEOUT: 1000,

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

  JOB_RUNNER: {
    INTERVAL: 1000 * 60 * 5,
    JOB: {
      MAX_ATTEMPTS: 3,
      TIMEOUT: 1000 * 60, // task timeout at 60 seconds
    },
    SYNC: {
      ATTEMPT_FAILURE_WRITE_LOG: 12,
    },
  },

  JWT: {
    EXPIRES: {
      ACCESS: 60 * 15, // 15mins access token
      REFRESH: 60 * 60 * 24 * 7, // number of days (in seconds)
    },
  },

  LOGGER_URL: 'https://service.alextsui.net/logger',

  MESSENGER: { MAX_ATTEMPTS: 3 },

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
      REFERRAL: '30d',
      REPLY_SLIP: '400d',
      SYNC_JOB: '30d',
      USER: '400d',
      USER_INTEREST: '180d',
      VERIFICATION: '1d',
    },
    SCHEMA_OPTS: {
      timestamps: true, // add createdAt & updatedAt fields by default
      toJSON: {
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
    PRESIGNED_URL_PUT_EXPIRY: 60 * 5, // in seconds
    PRESIGNED_URL_GET_EXPIRY: 60 * 5, // in seconds
    // REPORT_EXPIRY: 60 * 60 * 24 * 7, // report expires in seconds
  },

  SATELLITE: {
    SEED_EXPIRES_IN: 60 * 30, // seed expires in 30min (seed file removed)
    TOKEN_EXPIRES_IN: 60 * 60 * 24, // token expires in 1 day
  },

  TENANT_BINDING: {
    TOKEN_EXPIRES_IN: 60 * 60 * 24 * 1, // expires in 1 day
  },

  TUTOR: {
    RANKING: {
      ANALYSIS_DAY: 120, // analysis periods
      ANALYSIS_MIN: 20, // min amount of questions required for ranking
      ANALYSIS_MAX: 2000, // only analyze using most recent n questions
    },
  },

  USER: {
    DARK_MODE: false,
    FLAGS: [],
    IDENTIFIABLE_EXPIRY: 6, // IDENTIFIABLE expires after 3 years
    LOCALE: SYSTEM.LOCALE.enUS,
    SUSPENSION_DAY: 7,
    TIMEZONE: 'Asia/Hong_Kong',
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
