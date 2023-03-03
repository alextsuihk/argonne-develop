/**
 * Factory: User & Tutor
 *  generate fake user & contacts for multiple users. All users are in TUTOR tenants, some in STEM
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import type { LeanDocument, Types } from 'mongoose';
import mongoose from 'mongoose';

import configLoader from '../../config/config-loader';
import School from '../../models/school';
import Subject from '../../models/subject';
import type { TenantDocument } from '../../models/tenant';
import Tenant from '../../models/tenant';
import type { TutorDocument } from '../../models/tutor';
import Tutor from '../../models/tutor';
import type { TutorRankingDocument } from '../../models/tutor-ranking';
import TutorRanking from '../../models/tutor-ranking';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { idsToString, prob, randomId, randomString, schoolYear, shuffle } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';
import { findLevels } from '../seed/level-seed';

const { QUESTION, TENANT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

/**
 * (helper) Create (without saving) fakeUser and link contacts
 */
const fakeUsers = async (
  tenant: LeanDocument<TenantDocument> | null,
  namePrefix = 'unk',
  level: string | Types.ObjectId | null,
  count = 100,
  minCredit = DEFAULTS.CREDITABILITY.MIN,
  maxCredit = DEFAULTS.CREDITABILITY.MAX,
) => {
  const [{ teacherLevel, primaryLevels, juniorLevels, seniorLevels }, avatars] = await Promise.all([
    findLevels(),
    new Promise<string[]>((resolve, reject) => {
      minioClient.getObject(publicBucket, 'avatars.json', (_, dataStream) => {
        const chunks: Uint8Array[] = [];

        dataStream.on('error', reject);
        dataStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        dataStream.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))));
      });
    }),
  ]);

  if (
    level &&
    !idsToString([teacherLevel, ...primaryLevels, ...juniorLevels, ...seniorLevels]).includes(level.toString())
  )
    throw new Error('Invalid Level');

  const isStudent =
    tenant && level && idsToString([...primaryLevels, ...juniorLevels, ...seniorLevels]).includes(level.toString());

  const users = Array(count)
    .fill(0)
    .map((_, idx) => {
      const status = prob(0.9) ? USER.STATUS.ACTIVE : USER.STATUS.DELETED;
      const email = status === USER.STATUS.DELETED ? `${faker.internet.email()}@@factory` : faker.internet.email();
      const createdAt = faker.date.recent(1); // register in past year

      return new User<Partial<UserDocument>>({
        tenants: tenant ? [tenant._id] : [],
        flags: tenant?.school && prob(0.3) ? [USER.FLAG.EDA] : [],
        status,
        name: `${namePrefix} ${idx} ${faker.internet.userName()}`,
        studentIds: isStudent ? [`${tenant.school}#${String(idx).padStart(5, '0')}-${randomString()}`] : [],
        emails: [prob(0.2) ? email.toUpperCase() : email.toLowerCase()], // some emails are verified
        password: User.genValidPassword(),
        // ...(prob(0.9) && { avatarUrl: faker.internet.avatar() }),
        ...(prob(0.9) && { avatarUrl: prob(0.5) ? faker.internet.avatar() : avatars.sort(shuffle)[0] }),

        creditability: faker.datatype.number({ min: minCredit, max: maxCredit }), // creditability
        identifiedAt: new Date(),
        histories:
          tenant?.school && level
            ? [
                {
                  year: schoolYear(),
                  school: tenant.school,
                  ...(isStudent && { studentId: `${tenant._id}#${randomString()}` }),
                  level,
                  updatedAt: new Date(),
                },
              ]
            : [],
        createdAt,
        ...(status === USER.STATUS.DELETED && { deletedAt: new Date() }),
        updatedAt: faker.date.between(createdAt, new Date()),
      });
    });

  return users;
};
/**
 * (helper) Make User Contacts (in place)
 */
const fakeContacts = (users: UserDocument[], maxContact = 15) =>
  users.forEach((user, idx) => {
    const friends = users
      .slice(idx + 1) // for preventing duplication
      .sort(shuffle)
      .filter(
        friend =>
          friend._id.toString() !== user._id.toString() && // could not make friend with himself
          idsToString(user.tenants).filter(x => idsToString(friend.tenants).includes(x)).length, // must have intersected (common) tenant
      )
      .slice(0, Math.max(0, maxContact - user.contacts.length - Math.floor(Math.random() * 5)));

    user.contacts.push(...friends.map(f => ({ user: f._id, name: prob(0.8) ? f.name : faker.name.firstName() })));
    friends.forEach(friend =>
      friend.contacts.push({
        user: user._id,
        name: prob(0.8) ? user.name : faker.name.firstName(),
      }),
    );
  });

/**
 * Generate (factory)
 *
 */
const fake = async (counts: number[]): Promise<string> => {
  const [studentCount = 30, teacherCount = 20, tutorCount = 50] = counts; // per tenant (per level for studentCount)

  const [{ teacherLevel }, schools, subjects, tenants] = await Promise.all([
    findLevels(),
    School.find({ deletedAt: { $exists: false } }).lean(),
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.find({ deletedAt: { $exists: false } }).lean(),
  ]);

  const stemTenantId = tenants.find(tenant => tenant.code === 'STEM')!._id.toString();
  const tutorTenantId = tenants.find(tenant => tenant.code === 'TUTOR')!._id.toString();

  const fakeTutors = (tenant: LeanDocument<TenantDocument>, users: LeanDocument<UserDocument>[]) =>
    users.map(user => {
      const [subject] = subjects.sort(shuffle);
      const level = randomId(subject!.levels)!;

      const tutor = new Tutor<Partial<TutorDocument>>({
        user: user._id,
        tenant: tenant._id,
        ...(prob(0.6) && { intro: faker.lorem.slug(5) }),
        ...(prob(0.3) && { officeHour: faker.lorem.slug(4) }),
        credentials: prob(0.8)
          ? [
              {
                _id: new mongoose.Types.ObjectId(),
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
            _id: new mongoose.Types.ObjectId(),
            ...(prob(0.5) && { note: faker.lorem.slug(6) }),
            lang: Object.keys(QUESTION.LANG).sort(shuffle)[0]!,
            level,
            subject: subject!._id,
            ranking: { updatedAt: new Date(), correctness: 0, punctuality: 0, explicitness: 0 },
          })),
      });

      return tutor;
    });

  const users: UserDocument[] = [];
  const tutors: TutorDocument[] = [];

  for (const tenant of tenants) {
    const school = schools.find(school => school._id.toString() === tenant.school?.toString());

    const [allStudents, teachers, tutorUsers] = await Promise.all([
      school ? Promise.all(school?.levels.map(level => fakeUsers(tenant, 'student', level, studentCount))) : [],
      tenant.services.includes(TENANT.SERVICE.CLASSROOM)
        ? fakeUsers(tenant, 'teacher', teacherLevel._id.toString(), teacherCount)
        : [],
      tenant.services.includes(TENANT.SERVICE.TUTOR) ? fakeUsers(tenant, 'tutor', null, tutorCount) : [],
    ]);

    const students = allStudents.flat();
    if (students.length)
      students.forEach(student => {
        student.tenants = Array.from(
          new Set([...idsToString(student.tenants), ...(prob(0.2) ? [stemTenantId, tutorTenantId] : [tutorTenantId])]),
        );
      }); // some students enroll STEM, ALL students enroll TUTOR

    users.push(...students, ...teachers, ...tutorUsers);

    if (tenant.services.includes(TENANT.SERVICE.TUTOR))
      tutors.push(
        ...fakeTutors(
          tenant,
          [...students, ...teachers]
            .sort(shuffle)
            .slice(Math.floor((students.length + teachers.length) / -5)) // 1/5 of the students + teachers are tutors
            .concat(tutorUsers),
        ),
      );
  }

  fakeContacts(users);

  // create tutor-ranking
  // const tutorRankings: TutorRankingDocument[] = [];

  const tutorRankings = tutors
    .map(tutor => {
      const { tenant, specialties } = tutor;
      return users
        .sort(shuffle)
        .slice(0, 3)
        .map(
          user =>
            new TutorRanking<Partial<TutorRankingDocument>>({
              tenant,
              tutor: tutor.user,
              student: user._id,
              question: new mongoose.Types.ObjectId(),
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

  await Promise.all([Tutor.create(tutors), User.create(users), TutorRanking.create(tutorRankings)]);
  return `(${chalk.green(users.length)} users created - ${chalk.green(tutors.length)} tutors created - ${chalk.green(
    tutorRankings.length,
  )} tutorRankings created)`;
};

export { fake };
