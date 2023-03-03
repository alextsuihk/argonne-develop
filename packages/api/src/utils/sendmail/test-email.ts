/**
 * Sendmail: Test Email
 */

import { LOCALE } from '@argonne/common';

import { sendmail } from './common';

const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;

export default async (name: string, locale: string, email: string): Promise<boolean> => {
  const [subject, body] =
    locale === zhHK
      ? ['測試郵件', `你好, ${name}, 這是一封測試郵件 `]
      : locale === zhCN
      ? ['测试邮件 ', `你好, ${name}, 这是一封测试邮件 `]
      : ['Test Email', `Hello, ${name}, this is a test email`];

  return sendmail(email, subject, body, `${__filename}: [ ${subject} ] ${email}`);
};
