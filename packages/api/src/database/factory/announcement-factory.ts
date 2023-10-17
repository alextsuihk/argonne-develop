/**
 * Factory: Announcement
 *
 */

import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import type { Types } from 'mongoose';

import type { AnnouncementDocument } from '../../models/announcement';
import Announcement from '../../models/announcement';
import Tenant from '../../models/tenant';
import { shuffle } from '../../utils/helper';

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param count: for all tenants
 * @param tenantCount: per tenant
 *
 */
const fake = async (codes: string[], count = 10, tenantCount = 3): Promise<string> => {
  const tenants = await Tenant.find({
    ...(codes.length && { code: { $in: codes } }),
    deletedAt: { $exists: false },
  }).lean();

  const fakeAnnouncements = (count: number, tenant?: Types.ObjectId) =>
    Array(count)
      .fill(0)
      .map(
        () =>
          new Announcement<Partial<AnnouncementDocument>>({
            ...(tenant && { tenant }),
            title: faker.lorem.slug(5),
            message: faker.lorem.sentences(3),
            beginAt: faker.date.soon({ days: 3 }),
            endAt: faker.date.soon({ days: 30 }),
          }),
      );

  const { insertedCount } = await Announcement.insertMany<Partial<AnnouncementDocument>>(
    [
      ...fakeAnnouncements(count),
      ...tenants
        .sort(shuffle)
        .map(tenant => fakeAnnouncements(tenantCount, tenant._id))
        .flat(),
    ],
    { rawResult: true },
  );

  return `(${chalk.green(insertedCount)} announcements created)`;
};

export { fake };
