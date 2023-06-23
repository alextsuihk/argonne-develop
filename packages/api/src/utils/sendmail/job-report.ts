/**
 * Sendmail: Job Result
 */

import { LOCALE } from '@argonne/common';

import configLoader from '../../config/config-loader';
import type { JobDocument } from '../../models/job';
import type { Id, UserDocument } from '../../models/user';
import { sendmail } from './common';

const { zhCN, zhHK } = LOCALE.DB_ENUM.SYSTEM.LOCALE;
const { config } = configLoader;

export default async (user: UserDocument & Id, job: JobDocument & Id): Promise<void> => {
  const { name, locale, emails } = user;

  if (emails[0]) {
    const [subject, body] =
      locale === zhHK
        ? [
            'Subject',
            `${name}, Job ${job.title} has finished, please download result from ${config.appUrl}/jobs/${job._id}`,
          ]
        : locale === zhCN
        ? [
            'Subject',
            `${name},Job ${job.title} has finished, please download result from ${config.appUrl}/jobs/${job._id}`,
          ]
        : [
            `Job ${job.title} has completed`,
            `${name}, Job ${job.title} has finished, please download result from ${config.appUrl}/jobs/${job._id}`,
          ];

    await sendmail(emails[0], subject, body, `${__filename}: ${emails[0]} [ ${subject} ]`);
  }
};
