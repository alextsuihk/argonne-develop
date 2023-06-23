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
import { idsToString, mongoId, prob, randomId, randomString, schoolYear, shuffle } from '../../utils/helper';

const { QUESTION, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

/**
 * Generate (factory)
 *
 */
const fake = async (code = 'TUTOR'): Promise<string> => {
  const [levels, subjects, tenant, rootUsers] = await Promise.all([
    Level.find({ deletedAt: { $exists: false } }).lean(),
    Subject.find({ deletedAt: { $exists: false } }).lean(),
    Tenant.findOne({ code }).lean(),
    User.find({ roles: USER.ROLE.ROOT }),
  ]);
  if (!tenant) throw `Tenant ${code} is not found.`;

  const specialties = (count = 5): TutorDocument['specialties'] =>
    Array(count)
      .fill(0)
      .map(_ => ({
        _id: mongoId(),
        ...(prob(0.5) && { note: faker.lorem.words(5) }),
        lang: Object.keys(QUESTION.LANG).sort(shuffle)[0]!,
        level: randomId(levels)!,
        subject: randomId(subjects)!,
        ranking: { updatedAt: new Date(), correctness: 0, punctuality: 0, explicitness: 0 },
      }));

  // create fake system-tutor
  const systemTutors: Partial<UserDocument & TutorDocument>[] = [
    {
      name: '英皇 John Chan 導師',
      officeHour: '24 x 7',
      credentials: [
        { _id: mongoId(), title: '英皇首席', proofs: [], verifiedAt: faker.date.recent(90), updatedAt: new Date() },
        { _id: mongoId(), title: '天才導師', proofs: [], verifiedAt: faker.date.recent(90), updatedAt: new Date() },
      ],
      specialties: specialties(3),
    },
    {
      name: '遵理 Miss Lee',
      officeHour: 'M: 5-10pm, W: 9-11pm',
      credentials: [
        {
          _id: mongoId(),
          title: '11A DSE 天才狀元',
          proofs: [],
          verifiedAt: faker.date.recent(90),
          updatedAt: new Date(),
        },
      ],
      specialties: specialties(2),
    },
    {
      name: '張Sir St. Joe',
      officeHour: 'M-F: after 6pm, Sat & Sun 全日',
      credentials: [
        { _id: mongoId(), title: '哈佛畢業', proofs: [], verifiedAt: faker.date.recent(90), updatedAt: new Date() },
      ],
      specialties: specialties(6),
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
      supervisors: idsToString(rootUsers),
      identifiedAt: new Date(),
      schoolHistories:
        tenant.school && prob(0.4)
          ? [
              {
                year: schoolYear(),
                school: tenant.school,
                level: randomId(levels)!,
                schoolClass: '1X',
                updatedAt: new Date(),
              },
            ]
          : [],
    });

    const tutor = new Tutor<Partial<TutorDocument>>({
      user: user._id,
      tenant: tenant._id,
      officeHour,
      credentials,
      specialties,
    });

    return { user, tutor };
  });

  const users = tuples.map(({ user }) => user);
  const tutors = tuples.map(({ tutor }) => tutor);

  // add staffs[] to rootUsers[]
  rootUsers.forEach(root => (root.staffs = idsToString(users)));

  await Promise.all([User.create(users), Tutor.create(tutors), ...rootUsers.map(root => root.save())]);
  return `(${chalk.green(systemTutors.length)} systemTutors to ${rootUsers.length} rootUsers) created)`;
};

export { fake };
