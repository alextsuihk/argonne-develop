/**
 * Controller: Contributions
 *
 */

import { LOCALE } from '@argonne/common';

import Level from '../models/level';
import School from '../models/school';
import User from '../models/user';
import { latestSchoolHistory } from '../utils/helper';

type Contributor = {
  user: string;
  name: string;
  school?: string;
};

const { MSG_ENUM } = LOCALE;

export const sanitizeContributors = async (contributors: Contributor[]) => {
  const [levels, schools, users] = await Promise.all([
    Level.find({ deletedAt: { $exists: false } }).lean(),
    School.find({ deletedAt: { $exists: false } }).lean(),
    User.find({ _id: { $in: contributors.map(c => c.user) }, deletedAt: { $exists: false } }).lean(),
  ]);

  return contributors.map(contributor => {
    const user = users.find(user => user._id.equals(contributor.user));
    const schoolHistories = user && latestSchoolHistory(user.schoolHistories);
    const level = schoolHistories && levels.find(level => level._id.equals(schoolHistories.level));

    const schoolId = contributor.school || schoolHistories?.school;
    const school = !!schoolId && schools.find(school => school._id.equals(schoolId));
    if (!user || !level || !school) throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };

    return {
      user: user._id,
      name: contributor.school ? contributor.name : `${contributor.name} (${level.code} @ ${school.code})`,
      school: school._id,
    };
  });
};
