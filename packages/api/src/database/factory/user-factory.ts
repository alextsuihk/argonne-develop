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
import { prob, randomItem, randomItems, randomString, schoolYear, shuffle } from '../../utils/helper';
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
  count = 50,
  maxContact = 10,
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
    tenant: Types.ObjectId,
    code: string,
    extra: { school: Types.ObjectId; level: Types.ObjectId } | null,
    minCredit = DEFAULTS.CREDITABILITY.MIN,
    maxCredit = DEFAULTS.CREDITABILITY.MAX,
  ) =>
    Array(count * (type === 'student' ? SCHOOL_CLASSES.length : 1))
      .fill(0)
      .map((_, idx) => {
        const isDeleted = prob(0.1);
        const email = prob(0.2) ? faker.internet.email().toUpperCase() : faker.internet.email().toLowerCase(); // some emails are verified
        const createdAt = faker.date.recent(1); // register in past year
        const levelCode = extra
          ? [...primaryLevels, ...juniorLevels, ...seniorLevels].find(l => l._id.equals(extra.level))?.code
          : undefined;
        const schoolClass = levelCode && `${levelCode.slice(-1)}-${SCHOOL_CLASSES[idx % SCHOOL_CLASSES.length]}`;

        return new User<Partial<UserDocument>>({
          tenants: [tenant],
          flags: extra?.school && prob(0.25) ? [...DEFAULTS.USER.FLAGS, USER.FLAG.EDA] : DEFAULTS.USER.FLAGS,
          status: isDeleted ? USER.STATUS.DELETED : USER.STATUS.ACTIVE,
          name: `${code} (${type}) ${idx} ${faker.internet.userName()}`,
          studentIds:
            extra?.school && type === 'student' ? [`${tenant}#${String(idx).padStart(5, '0')}-${randomString()}`] : [],
          emails: isDeleted ? [`${email}@@factory`] : [email],
          password: User.genValidPassword(),
          ...(prob(0.9) && { avatarUrl: prob(0.5) ? faker.internet.avatar() : randomItem(avatars) }),

          creditability: faker.datatype.number({ min: minCredit, max: maxCredit }), // creditability
          identifiedAt: new Date(),
          schoolHistories: extra
            ? [{ year: schoolYear(), school: extra.school, level: extra.level, schoolClass, updatedAt: new Date() }]
            : [],
          createdAt,
          updatedAt: faker.date.between(createdAt, new Date()),
          ...(isDeleted && { deletedAt: new Date() }),
        });
      });

  // schoolTenant: create user with schoolHistory, populate all levels (include teacherLevel)
  const schoolTenantsUsers = tenants
    .sort(shuffle)
    .map(tenant => {
      const school = schools.find(school => tenant.school?.equals(school._id));

      return school
        ? [
            ...fakeUsers(teacherCount, 'teacher', tenant._id, tenant.code, {
              school: school._id,
              level: teacherLevel._id,
            }),
            ...school.levels
              .sort(shuffle)
              .map(level => fakeUsers(studentCount, 'student', tenant._id, tenant.code, { school: school._id, level }))
              .flat(),
          ]
        : [];
    })
    .flat();

  const nonSchoolTenants = tenants.filter(t => !t.school).sort(shuffle);

  // non schoolTenant
  const nonSchoolTenantsUsers = nonSchoolTenants.map(t => fakeUsers(count, 'other', t._id, t.code, null)).flat();

  // some schoolTenant users also attach to non schoolTenant (such as STEM & TUTOR)
  randomItems(schoolTenantsUsers, Math.round(schoolTenantsUsers.length * 0.8)).forEach(user =>
    user.tenants.push(
      ...nonSchoolTenants
        .map(t => t._id)
        .sort(shuffle)
        .slice(0, Math.ceil(Math.random() * 3)),
    ),
  );

  const users = [...schoolTenantsUsers, ...nonSchoolTenantsUsers];

  /**
   * fake contacts
   */
  const activeUsers = users.filter(u => u.status === USER.STATUS.ACTIVE);
  activeUsers.forEach((user, idx) => {
    const friends = activeUsers
      .slice(idx + 1) // for preventing duplication
      .sort(shuffle)
      .filter(
        friend =>
          !friend._id.equals(user._id) && // could not make friend with himself, double safety: slice(idx+1) already skip user._id
          user.tenants.filter(x => friend.tenants.some(t => t.equals(x))), // must have intersected (common) tenant
      )
      .slice(0, Math.max(0, maxContact - user.contacts.length - Math.floor(Math.random() * 5)));

    user.contacts.push(
      ...friends.map(f => ({ user: f._id, ...(prob(0.5) && { name: faker.name.firstName() }), updatedAt: new Date() })),
    );
    friends.forEach(friend =>
      friend.contacts.push({
        user: user._id,
        ...(prob(0.5) && { name: faker.name.firstName() }),
        updatedAt: new Date(),
      }),
    );
  });

  await User.create<Partial<UserDocument>>(users); // must use create() to execute pre-save hook for password-hashing (note: hashing is slow)
  return `(${chalk.green(users.length)} users for ${chalk.green(tenants.length)} tenants created)`;
};

export { fake };
