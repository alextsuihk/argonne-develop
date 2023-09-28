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
import type { TutorRankingDocument } from '../../models/tutor-ranking';
import TutorRanking from '../../models/tutor-ranking';
import User from '../../models/user';
import { mongoId, prob, randomItem, randomItems } from '../../utils/helper';

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
    .map(({ _id: tid }) => {
      const tenantUsers = users.filter(user => user.tenants.some(t => t.equals(tid)));

      return randomItems(tenantUsers, Math.ceil(tenantUsers.length * ratio)).map(user => {
        const subject = randomItem(subjects);

        return new Tutor<Partial<TutorDocument>>({
          tenant: tid,
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
              updatedAt: faker.date.recent(30),
              ...(prob(0.7) && { verifiedAt: faker.date.recent(15) }),
            })),

          // at least one specialties
          specialties: Array(Math.ceil(Math.random() * 3))
            .fill(0)
            .map(() => ({
              _id: mongoId(),
              ...(prob(0.5) && { note: faker.lorem.slug(6) }),
              lang: randomItem(Object.keys(QUESTION.LANG)),
              level: randomItem(subject.levels),
              subject: subject._id,
              ranking: { updatedAt: new Date(), correctness: 0, punctuality: 0, explicitness: 0 },
            })),
        });
      });
    })
    .flat()
    .flat();

  // create tutor-ranking by students
  const tutorRankings = tutors
    .map(tutor => {
      const { tenant, specialties } = tutor;
      return randomItems(
        users.filter(user => !tutor.user.equals(user._id) && user.tenants.some(t => t.equals(tenant))), // one cannot post ranking for himself, and intersected tenant
        rankingCount,
      ).map(
        user =>
          new TutorRanking<Partial<TutorRankingDocument>>({
            tenant,
            tutor: tutor.user,
            student: user._id,
            question: mongoId(), // just use a fake questionId
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

  await Promise.all([
    Tutor.insertMany<Partial<TutorDocument>>(tutors, { rawResult: true }),
    TutorRanking.insertMany<Partial<TutorRankingDocument>>(tutorRankings, { rawResult: true }),
  ]);
  return `(${chalk.green(tutors.length)} tutors created - ${chalk.green(tutorRankings.length)} tutorRankings created)`;
};

export { fake };
