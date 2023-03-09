/**
 * Sendmail: Reset Password
 */

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';

import configLoader from '../../config/config-loader';
import { sendmail } from './common';

const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { config, DEFAULTS } = configLoader;

export default async (name: string, locale: string, email: string, token: string): Promise<boolean> => {
  const expiresBy = addSeconds(new Date(), DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN);

  const [subject, body] =
    locale === zhHK
      ? [
          '重置密碼',
          `${name}, <a href="${config.appUrl}/resetPassword/${token}">Reset Password</a> by ${expiresBy.toString()}`,
        ]
      : locale === zhCN
      ? [
          '重置密码',
          `${name}, <a href="${config.appUrl}/resetPassword/${token}">Reset Password</a> by ${expiresBy.toString()}`,
        ]
      : [
          'Reset Password',
          `${name}, <a href="${config.appUrl}/resetPassword/${token}">Reset Password</a> by ${expiresBy.toString()}`,
        ];

  return sendmail(email, subject, body, `${__filename}: [ ${subject} ] ${email}`);
};
