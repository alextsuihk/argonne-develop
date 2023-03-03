/**
 * Sendmail: Confirmation Email (Registration or AddEmail)
 */

import { LOCALE } from '@argonne/common';
import { addSeconds } from 'date-fns';
import type { LeanDocument } from 'mongoose';

import configLoader from '../../config/config-loader';
import type { UserDocument } from '../../models/user';
import token from '../token';
import { sendmail } from './common';

const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { config, DEFAULTS } = configLoader;

export default async (user: LeanDocument<UserDocument>, email: string): Promise<void> => {
  const expiresBy = addSeconds(new Date(), DEFAULTS.AUTH.EMAIL_CONFIRM_EXPIRES_IN);
  const confirmToken = await token.signEvent(email, 'email', DEFAULTS.AUTH.EMAIL_CONFIRM_EXPIRES_IN);

  const { name, locale } = user;
  const [subject, body] =
    locale === zhHK
      ? [
          '請確認郵箱',
          `你好, ${name}, <a href="${
            config.appUrl
          }/emailConfirm/${confirmToken}">Verify Email</a> by ${expiresBy.toString()}`,
        ]
      : locale === zhCN
      ? [
          '請確認郵箱',
          `你好, ${name}, <a href="${
            config.appUrl
          }/emailConfirm/${confirmToken}">Verify Email</a> by ${expiresBy.toString()}`,
        ]
      : [
          'Please confirm email',
          `Welcome, ${name}, <a href="${
            config.appUrl
          }/emailConfirm/${confirmToken}">Verify Email</a> by ${expiresBy.toString()}`,
        ];

  await sendmail(email, subject, body, `${__filename}: [ ${subject} ] ${email}`);
};
