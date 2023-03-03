/**
 * Sendmail: Reset Password
 */

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { LeanDocument } from 'mongoose';

import configLoader from '../../config/config-loader';
import type { UserDocument } from '../../models/user';
import { sendmail } from './common';

const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { config, DEFAULTS } = configLoader;

export default async (user: LeanDocument<UserDocument>, email: string, token: string): Promise<void> => {
  const expiresBy = addSeconds(new Date(), DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN);

  const { name, locale } = user;

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

  await sendmail(email, subject, body, `${__filename}: [ ${subject} ] ${email}`);
};
