/**
 * Factory: User
 *  generate fake user & contacts, setup schoolHistories for school tenants
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import type { Types } from 'mongoose';

import configLoader from '../../config/config-loader';
import School from '../../models/school';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { idsToString, prob, randomString, schoolYear, shuffle } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';
import { findLevels } from '../seed/level-seed';

const { USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param studentCount: student per schoolClass per level per tenant
 * @param teacherCount: teacher per tenant
 * @param count: users per (non school) tenant
 * @param maxContact: max contacts per user
 */
const fake = async (
  codes: string[],
  studentCount = 25,
  teacherCount = 20,
  count = 40,
  maxContact = 15,
): Promise<string> => {
  const [{ teacherLevel, primaryLevels, juniorLevels, seniorLevels }, schools, tenants, avatars] = await Promise.all([
    findLevels(),
    School.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.find({ ...(codes.length && { code: { $in: codes } }), deletedAt: { $exists: false } }).lean(),
    new Promise<string[]>((resolve, reject) => {
      minioClient.getObject(publicBucket, 'avatars.json', (_, dataStream) => {
        const chunks: Uint8Array[] = [];
        dataStream.on('error', reject);
        dataStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        dataStream.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))));
      });
    }),
  ]);

  const SCHOOL_CLASSES = ['A', 'B'];
  const fakeUsers = (
    count: number,
    type: 'student' | 'teacher' | 'other',
    tenant: string | Types.ObjectId,
    school: string | Types.ObjectId | null,
    level: string | Types.ObjectId | null,
    minCredit = DEFAULTS.CREDITABILITY.MIN,
    maxCredit = DEFAULTS.CREDITABILITY.MAX,
  ) =>
    Array(count * SCHOOL_CLASSES.length)
      .fill(0)
      .map((_, idx) => {
        const status = prob(0.9) ? USER.STATUS.ACTIVE : USER.STATUS.DELETED;
        const email = status === USER.STATUS.DELETED ? `${faker.internet.email()}@@factory` : faker.internet.email();
        const createdAt = faker.date.recent(1); // register in past year
        const levelCode = [...primaryLevels, ...juniorLevels, ...seniorLevels].find(
          l => l._id.toString() === level?.toString(),
        )?.code;
        const schoolClass = levelCode && `${levelCode.slice(-1)}-${SCHOOL_CLASSES[idx % SCHOOL_CLASSES.length]}`;

        return new User<Partial<UserDocument>>({
          tenants: [tenant],
          flags: school && prob(0.25) ? [USER.FLAG.EDA] : [],
          status,
          name: `${type} ${idx} ${faker.internet.userName()}`,
          studentIds: type === 'student' ? [`${school}#${String(idx).padStart(5, '0')}-${randomString()}`] : [],
          emails: [prob(0.2) ? email.toUpperCase() : email.toLowerCase()], // some emails are verified
          password: User.genValidPassword(),
          ...(prob(0.9) && { avatarUrl: prob(0.5) ? faker.internet.avatar() : avatars.sort(shuffle)[0] }),

          creditability: faker.datatype.number({ min: minCredit, max: maxCredit }), // creditability
          identifiedAt: new Date(),
          schoolHistories:
            school && level ? [{ year: schoolYear(), school, level, schoolClass, updatedAt: new Date() }] : [],
          createdAt,
          ...(status === USER.STATUS.DELETED && { deletedAt: new Date() }),
          updatedAt: faker.date.between(createdAt, new Date()),
        });
      });

  // schoolTenant: create user with history, populate all levels (include teacherLevel)
  const schoolTenantsUsers = tenants
    .filter(tenant => !!tenant.school)
    .map(tenant => {
      const school = schools.find(school => school._id.toString() === tenant.school?.toString());

      return school
        ? school.levels
            .sort(shuffle)
            .map(lvl => [
              ...fakeUsers(studentCount, 'student', tenant._id, school._id, lvl),
              ...fakeUsers(teacherCount, 'teacher', tenant._id, school._id, teacherLevel._id),
            ])
            .flat()
        : [];
    })
    .flat();

  // nonSchoolTenant: 10% create new, attach some nonSchoolTenant to 80% of schoolTenantUser
  const nonSchoolTenantIds = idsToString(tenants.filter(t => !t.school).sort(shuffle));
  const nonSchoolTenantsUsers = nonSchoolTenantIds
    .map(tenantId => fakeUsers(count, 'other', tenantId, null, null))
    .flat();

  // attach some nonSchoolTenantIds to users of schoolTenants
  schoolTenantsUsers
    .sort(shuffle)
    .slice(0, Math.round(schoolTenantsUsers.length * 0.8))
    .forEach(user => user.tenants.push(...nonSchoolTenantIds.slice(0, Math.ceil(Math.random() * 3))));

  const users = [...schoolTenantsUsers, ...nonSchoolTenantsUsers];

  // fake contacts
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

    user.contacts.push(...friends.map(f => ({ user: f._id, ...(prob(0.5) && { name: faker.name.firstName() }) })));
    friends.forEach(friend =>
      friend.contacts.push({ user: user._id, ...(prob(0.5) && { name: faker.name.firstName() }) }),
    );
  });

  await User.create(users); // bcrypt.hash is very slow
  return `(${chalk.green(users.length)} users [for ${tenants.length} tenant(s)] created)`;
};

export { fake };
