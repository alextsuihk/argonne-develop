/**
 * Base Configuration
 *
 */

import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';

import { isDevMode, isProdMode, isTestMode } from '../utils/environment';
import { randomString, terminate } from '../utils/helper';

type MODE = 'HUB' | 'SATELLITE';

// override when isDevMode & isTestMode
const envFile = path.join(__dirname, '..', '..', 'dev.env');
if ((isDevMode || isTestMode) && fs.existsSync(envFile)) dotenv.config({ path: envFile });

// convert URL string format to minioClient ClientOption
const minioUrl = (url: string): { endPoint: string; port: number; useSSL: boolean } | never => {
  try {
    const decoded = new URL(url);
    const { protocol, hostname, port } = decoded;
    return {
      endPoint: hostname,
      port: Number(port) !== 0 ? Number(port) : protocol === 'https' ? 443 : 80,
      useSSL: protocol === 'https',
    };
  } catch (error) {
    return terminate('invalid or missing minioServerUrl');
  }
};

const minioServerUrl = process.env.APP_URL || 'http://localhost:9000';

const config = {
  mode: (process.env.MODE === 'HUB' ? 'HUB' : 'SATELLITE') as MODE,
  // restfulFullAccess: !!(!isProdMode || (process.env.MODE === 'HUB' && process.env.RESTFUL_FULL_ACCESS)),
  restfulFullAccess: !isProdMode,

  port: 4000,
  appUrl: process.env.APP_URL || 'http://localhost:4000',

  jwtSecret: isDevMode || isTestMode ? randomString() : process.env.JWT_SECRET ?? terminate('JWT_SECRET is required'),

  loggerApiKey: process.env.LOGGER_API_KEY,

  server: {
    amqp: { url: process.env.MQTT_URL || 'amqp://localhost' },

    minio: {
      serverUrl: minioServerUrl,
      endPoint: minioUrl(minioServerUrl).endPoint,
      port: minioUrl(minioServerUrl).port,
      useSSL: minioUrl(minioServerUrl).useSSL,
      accessKey: process.env.MINIO_USER || 'argonne',
      secretKey: process.env.MINIO_PASSWORD || '12345678',
      privateBucket: process.env.MINIO_PRIVATE_BUCKET || 'private',
      publicBucket: process.env.MINIO_PUBLIC_BUCKET || 'public',
    },
    mongo: { url: process.env.MONGO_URL ?? 'mongodb://localhost/argonne' },
    redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379/0' },
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 25,
    secure: !!process.env.SMTP_SECURE,
    authUser: process.env.SMTP_USER,
    authPass: process.env.SMTP_PASS,
    sender: process.env.SMTP_SENDER,
  },
  adminEmail: process.env.ADMIN_EMAIL || 'alex@inspire.hk',

  compatibleClients: process.env.COMPATIBLE_CLIENT_VERSIONS?.split(', ') ?? ['0.0.0-develop'],

  // Messenger
  messenger: {
    // Slack communication
    slack: {
      accessToken: process.env.SLACK_ACCESS_TOKEN,
      channel: process.env.SLACK_CHANNEL,
      enable: true,
      url: 'https://slack.com/api/chat.postMessage',
      // _workspace: 'onlinetutor-workspace.slack.com',
      // _appId: 'ALFHJUGUQ', // /* cspell: disable-line */
      // _clientId: '695576634517.695596968976',
      // _clientSecret: 'dec743f67d43c0cedb527471fb393935',
      // _signingSecret: 'bb0157a72e8113d29e0af55127902270',
      // _verificationToken: 'bb0157a72e8113d29e0af55127902270',
      // _oauthAccessToken:
      //   'xoxp-695576634517-689216456945-695598568640-004757b454dcc11542f52aa147c69450', // /* cspell: disable-line */
      // botUserOauthAccessToken: process.env.SLACK_ACCESS_TOKEN!, // /* cspell: disable-line */
    },

    // Twilio (WhatsApp) communication
    twilio: {
      accountSid: process.env.TWILIO_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    },

    vonage: {
      apiKey: process.env.VONAGE_API_KEY,
    },

    // Twitter
    // twitter: {
    //   enable: true,
    //   consumer_key: TODO,
    //   consumer_secret: TODO,
    //   access_token_key: TODO,
    //   access_token_secret: TODO,
    // },

    // WhatsApp
    whatsapp: {
      from: process.env.WHATSAPP_FROM,
    },

    webpush: {
      mailTo: process.env.WEBPUSH_MAILTO,
      publicKey: process.env.WEBPUSH_PUBLIC_KEY,
      privateKey: process.env.WEBPUSH_PRIVATE_KEY,
    },
  },

  // OAuth service provider
  oAuth2: {
    github: {
      // appId: '42781',
      clientId: process.env.GITHUB_CLIENT_ID,
      // clientSecret: '49a7a1bf8f1ee4f20b8ac9c9ff8f9237fcec0406',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUrl: process.env.GOOGLE_REDIRECT_URL,
    },
  },
};

export default config;
