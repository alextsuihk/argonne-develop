/**
 * Factory: Tutor
 *  generate fake user & contacts for multiple users. All users are in TUTOR tenants, some in STEM
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import Subject from '../../models/subject';
import Tenant from '../../models/tenant';
import type { TutorDocument } from '../../models/tutor';
import Tutor from '../../models/tutor';
import type { TutorRankingDocument } from '../../models/tutor-ranking';
import TutorRanking from '../../models/tutor-ranking';
import User from '../../models/user';
import { idsToString, mongoId, prob, randomId, shuffle } from '../../utils/helper';

const { QUESTION, TENANT, USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param ratio: ratio of tutors/users (per tenant)
 * @param rankingCount: number of ranking per tutor
 */
const fake = async (codes: string[], ratio = 0.2, rankingCount = 3): Promise<string> => {
  const [subjects, tutorTenants, users] = await Promise.all([
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.find({
      services: TENANT.SERVICE.TUTOR,
      ...(codes.length && { code: { $in: codes } }),
      deletedAt: { $exists: false },
    }).lean(),
    User.find({ status: USER.STATUS.ACTIVE, deletedAt: { $exists: false } }).lean(),
  ]);

  const tutors = tutorTenants
    .map(tenant => {
      const tenantUsers = users.filter(u => idsToString(u.tenants).includes(tenant._id.toString())).sort(shuffle);

      return tenantUsers.slice(0, Math.ceil(tenantUsers.length * ratio)).map(user => {
        const [subject] = subjects.sort(shuffle);
        const level = randomId(subject!.levels)!;

        return new Tutor<Partial<TutorDocument>>({
          user: user._id,
          tenant: tenant._id,
          ...(prob(0.6) && { intro: faker.lorem.slug(5) }),
          ...(prob(0.3) && { officeHour: faker.lorem.slug(4) }),
          credentials: prob(0.8)
            ? [
                {
                  _id: mongoId(),
                  title: faker.lorem.sentence(5),
                  proofs: [faker.lorem.sentence(5), faker.lorem.slug(5)],
                  updatedAt: faker.date.recent(30),
                  ...(prob(0.7) && { verifiedAt: faker.date.recent(15) }),
                },
              ]
            : [],
          specialties: Array(Math.ceil(Math.random() * 5))
            .fill(0)
            .map(_ => ({
              _id: mongoId(),
              ...(prob(0.5) && { note: faker.lorem.slug(6) }),
              lang: Object.keys(QUESTION.LANG).sort(shuffle)[0]!,
              level,
              subject: subject!._id,
              ranking: { updatedAt: new Date(), correctness: 0, punctuality: 0, explicitness: 0 },
            })),
        });
      });
    })
    .flat()
    .flat();

  // create tutor-ranking
  // const tutorRankings: TutorRankingDocument[] = [];
  const tutorRankings = tutors
    .map(tutor => {
      const { tenant, specialties } = tutor;
      return users
        .sort(shuffle)
        .slice(0, rankingCount)
        .map(
          user =>
            new TutorRanking<Partial<TutorRankingDocument>>({
              tenant,
              tutor: tutor.user,
              student: user._id,
              question: mongoId(),
              lang: specialties[0]!.lang,
              subject: specialties[0]!.subject,
              level: specialties[0]!.level,
              correctness: faker.datatype.number({ min: 1, max: 5 }) * 1000,
              explicitness: faker.datatype.number({ min: 1, max: 5 }) * 1000,
              punctuality: faker.datatype.number({ min: 1, max: 5 }) * 1000,
            }),
        );
    })
    .flat();

  await Promise.all([Tutor.create(tutors), TutorRanking.create(tutorRankings)]);
  return `(${chalk.green(tutors.length)} tutors created - ${chalk.green(tutorRankings.length)} tutorRankings created)`;
};

export { fake };
