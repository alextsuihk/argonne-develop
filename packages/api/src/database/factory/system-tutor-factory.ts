/**
 * Factory: SystemTutor
 *
 * generate system fake tutors, and they are children of Alex, so Alex could impersonate
 * also generate specialties
 */

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import configLoader from '../../config/config-loader';
import Level from '../../models/level';
import Subject from '../../models/subject';
import Tenant from '../../models/tenant';
import type { TutorDocument } from '../../models/tutor';
import Tutor from '../../models/tutor';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { mongoId, prob, randomItem, randomItems, randomString, schoolYear } from '../../utils/helper';

const { QUESTION, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

/**
 * Generate (factory)
 *
 */
const fake = async (code = 'TUTOR'): Promise<string> => {
  const [levels, subjects, tenant, { alexId }] = await Promise.all([
    Level.find({ deletedAt: { $exists: false } }).lean(),
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.findOne({ code }).lean(),
    User.findSystemAccountIds(),
  ]);
  if (!tenant) throw `Tenant ${code} is not found.`;
  if (!alexId) throw 'alexId is not found';

  const specialtiesAndRankings = (
    count = 5,
  ): { specialties: TutorDocument['specialties']; rankings: TutorDocument['rankings'] } => {
    const specialties = Array(count)
      .fill(0)
      .map(() => ({
        _id: mongoId(),
        tenant: tenant._id,
        ...(prob(0.5) && { note: faker.lorem.words(5) }),
        langs: randomItems(Object.keys(QUESTION.LANG), prob(0.5) ? 1 : 2),
        level: randomItem(levels)._id,
        subject: randomItem(subjects)._id,
        priority: 0,
      }));

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

    return { specialties, rankings };
  };

  // create fake system-tutor
  const systemTutors: Partial<UserDocument & TutorDocument>[] = [
    {
      name: '英皇 John Chan 導師',
      officeHour: '24 x 7',
      credentials: [
        {
          _id: mongoId(),
          title: '英皇首席',
          proofs: [],
          verifiedAt: faker.date.recent({ days: 90 }),
          updatedAt: new Date(),
        },
        {
          _id: mongoId(),
          title: '天才導師',
          proofs: [],
          verifiedAt: faker.date.recent({ days: 90 }),
          updatedAt: new Date(),
        },
      ],
      ...specialtiesAndRankings(3),
    },
    {
      name: '遵理 Miss Lee',
      officeHour: 'M: 5-10pm, W: 9-11pm',
      credentials: [
        {
          _id: mongoId(),
          title: '11A DSE 天才狀元',
          proofs: [],
          verifiedAt: faker.date.recent({ days: 90 }),
          updatedAt: new Date(),
        },
      ],
      ...specialtiesAndRankings(2),
    },
    {
      name: '張Sir St. Joe',
      officeHour: 'M-F: after 6pm, Sat & Sun 全日',
      credentials: [
        {
          _id: mongoId(),
          title: '哈佛畢業',
          proofs: [],
          verifiedAt: faker.date.recent({ days: 90 }),
          updatedAt: new Date(),
        },
      ],
      ...specialtiesAndRankings(6),
    },
  ];

  const tuples = systemTutors.map(({ name, officeHour, credentials, specialties }) => {
    const user = new User<Partial<UserDocument>>({
      status: USER.STATUS.ACTIVE,
      name,
      flags: DEFAULTS.USER.FLAGS,
      emails: [`sys-tutor-${randomString()}@${DEFAULTS.DOMAIN}`],
      password: User.genValidPassword(),
      ...(prob(0.9) && { avatarUrl: faker.internet.avatar() }),
      tenants: [tenant._id],
      supervisors: [alexId],
      identifiedAt: new Date(),
      schoolHistories:
        tenant.school && prob(0.4)
          ? [
              {
                year: schoolYear(),
                school: tenant.school,
                level: randomItem(levels)._id,
                updatedAt: new Date(),
              },
            ]
          : [],
    });

    const tutor = new Tutor<Partial<TutorDocument>>({
      user: user._id,
      officeHour,
      credentials,
      specialties,
    });

    return { user, tutor };
  });

  const users = tuples.map(({ user }) => user);
  const tutors = tuples.map(({ tutor }) => tutor);

  await Promise.all([
    User.insertMany<Partial<UserDocument>>(users, { includeResultMetadata: true }),
    Tutor.insertMany<Partial<TutorDocument>>(tutors, { includeResultMetadata: true }),
    User.updateMany({ _id: alexId }, { $addToSet: { staffs: { $each: users.map(u => u._id) } } }), // add staffs[] to rootUsers[]
  ]);
  return `(${chalk.green(systemTutors.length)} systemTutors) created)`;
};

export { fake };
