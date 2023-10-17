/**
 * Sendmail: Confirmation Email (Registration or AddEmail)
 */

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';

import configLoader from '../../config/config-loader';
import token, { EMAIL_TOKEN_PREFIX } from '../token';
import { sendmail } from './common';

const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { config, DEFAULTS } = configLoader;

export default async (name: string, locale: string, email: string): Promise<boolean> => {
  const expiresBy = addSeconds(new Date(), DEFAULTS.AUTH.EMAIL_CONFIRM_EXPIRES_IN);
  const confirmToken = await token.signStrings([EMAIL_TOKEN_PREFIX, email], DEFAULTS.AUTH.EMAIL_CONFIRM_EXPIRES_IN);
  const link = `${config.appUrl}/tokens/emailVerify/${confirmToken}`;

  const [subject, body] =
    locale === zhHK
      ? ['請確認郵箱', `你好, ${name}, <a href="${link}">Verify Email</a> by ${expiresBy.toString()}`]
      : locale === zhCN
      ? ['請確認郵箱', `你好, ${name}, <a href="${link}">Verify Email</a> by ${expiresBy.toString()}`]
      : ['Please confirm email', `Welcome, ${name}, <a href="${link}">Verify Email</a> by ${expiresBy.toString()}`];

  return sendmail(email, subject, body, `${__filename}: [ ${subject} ] ${email}`);
};
