/**
 * Factory: Tutor
 *
 * generate tutors & tutorRanking
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import Subject from '../../models/subject';
import Tenant from '../../models/tenant';
import type { TutorDocument } from '../../models/tutor';
import Tutor from '../../models/tutor';
import User from '../../models/user';
import { mongoId, prob, randomItem, randomItems, shuffle } from '../../utils/helper';

const { QUESTION, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param ratio: ratio of tutors/users (per tenant)
 */
const fake = async (codes: string[], ratio = 0.2): Promise<string> => {
  const [subjects, tutorTenants, users] = await Promise.all([
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.find({
      services: TENANT.SERVICE.TUTOR,
      ...(codes.length && { code: { $in: codes } }),
      deletedAt: { $exists: false },
    }).lean(),
    User.find({ status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } }, '_id tenants').lean(),
  ]);

  // Pick<UserDocument, '_id' | 'pushSubscriptions'>[]
  const tutors = randomItems(users.sort(shuffle), Math.floor(users.length * ratio)).map(user => {
    const subject = randomItem(subjects);

    const specialties: TutorDocument['specialties'] = tutorTenants
      .filter(({ _id }) => user.tenants.some(t => t.equals(_id))) // filter interested tenantIds
      .map(tenant =>
        Array(Math.ceil(Math.random() * 3 * tutorTenants.length))
          .fill(0)
          .map(() => ({
            _id: mongoId(),
            tenant: tenant._id,
            ...(prob(0.5) && { note: faker.lorem.slug(6) }),
            langs: randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2),
            level: randomItem(subject.levels),
            subject: subject._id,
            priority: 0,
          })),
      )
      .flat();

    const rankings: TutorDocument['rankings'] = [];
    specialties.forEach(({ level, subject }) => {
      if (rankings.some(ranking => !ranking.level.equals(level) && !ranking.subject.equals(subject)))
        rankings.push({
          level,
          subject,
          ...(prob(0.8) && { correctness: faker.number.int({ min: 1, max: 5 }) * 1000 }),
          ...(prob(0.8) && { explicitness: faker.number.int({ min: 1, max: 5 }) * 1000 }),
          ...(prob(0.8) && { punctuality: faker.number.int({ min: 1, max: 5 }) * 1000 }),
        });
    });

    return new Tutor<Partial<TutorDocument>>({
      user: user._id,

      ...(prob(0.6) && { intro: faker.lorem.slug(5) }),
      ...(prob(0.3) && { officeHour: faker.lorem.slug(4) }),

      // generate 0-2 credentials
      credentials: Array(Math.round(Math.random() * 2))
        .fill(0)
        .map(() => ({
          _id: mongoId(),
          title: faker.lorem.sentence(5),
          proofs: [faker.lorem.sentence(5), faker.lorem.slug(5)],
          updatedAt: faker.date.recent({ days: 30 }),
          ...(prob(0.7) && { verifiedAt: faker.date.recent({ days: 15 }) }),
        })),

      specialties,

      rankings,
      rankingsUpdatedAt: new Date(),
    });
  });

  await Tutor.insertMany<Partial<TutorDocument>>(tutors, { includeResultMetadata: true });
  return `(${chalk.green(tutors.length)} tutors created)`;
};

export { fake };
