/**
 * Sendmail: Reset Password
 */

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { Types } from 'mongoose';

import configLoader from '../../config/config-loader';
import token, { PASSWORD_TOKEN_PREFIX } from '../token';
import { sendmail } from './common';

const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { config, DEFAULTS } = configLoader;

export default async (userId: Types.ObjectId, name: string, locale: string, email: string): Promise<boolean> => {
  const expiresBy = addSeconds(new Date(), DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN);
  const resetToken = await token.signStrings(
    [PASSWORD_TOKEN_PREFIX, userId.toString()],
    DEFAULTS.AUTH.PASSWORD_RESET_EXPIRES_IN,
  );
  const link = `${config.appUrl}/tokens/resetPassword/${resetToken}`;

  const [subject, body] =
    locale === zhHK
      ? ['重置密碼', `${name}, <a href="${link}">Reset Password</a> by ${expiresBy.toString()}`]
      : locale === zhCN
      ? ['重置密码', `${name}, <a href="${link}">Reset Password</a> by ${expiresBy.toString()}`]
      : ['Reset Password', `${name}, <a href="${link}">Reset Password</a> by ${expiresBy.toString()}`];

  return sendmail(email, subject, body, `${__filename}: [ ${subject} ] ${email}`);
};
