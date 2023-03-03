/**
 * Factory: Announcement
 *
 */

import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import type { AnnouncementDocument } from '../../models/announcement';
import Announcement from '../../models/announcement';
import Tenant from '../../models/tenant';
import { shuffle } from '../../utils/helper';

/**
 * Generate (factory)
 *
 */
const fake = async (count = 10): Promise<string> => {
  const tenants = await Tenant.find({ deletedAt: { $exists: false } }).lean();

  const genAnnouncements = (tenant?: string) =>
    Array(count)
      .fill(0)
      .map(
        _ =>
          new Announcement<Partial<AnnouncementDocument>>({
            ...(tenant && { tenant }),
            title: faker.lorem.slug(5),
            message: faker.lorem.sentences(3),
            beginAt: faker.date.soon(3),
            endAt: faker.date.soon(30),
          }),
      );

  const announcements = [
    ...genAnnouncements(),
    ...tenants.map(tenant => genAnnouncements(tenant._id.toString())).flat(),
  ];

  await Announcement.create(announcements.sort(shuffle));

  return `(${chalk.green(announcements.length)} created)`;
};

export { fake };
