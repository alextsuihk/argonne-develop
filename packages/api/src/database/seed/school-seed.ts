/**
 * Seeder: School
 *
 * source: https://www.edb.gov.hk/en/edu-system/primary-secondary/spa-systems/secondary-spa/general-info/secondary-sch-list.html
 */

import { LOCALE } from '@argonne/common';
import chalk from 'chalk';
import convert from 'chinese_convert';

import District from '../../models/district';
import type { SchoolDocument } from '../../models/school';
import School from '../../models/school';
import { findLevels } from './level-seed';
import { internationalSchools, primarySchools, secondarySchools, tertiarySchools } from './school-data';

const { SCHOOL } = LOCALE.DB_ENUM;

const seed = async (): Promise<string> => {
  // get ALL districts info
  const [districts, { primaryLevels, juniorLevels, seniorLevels, tertiaryLevels }] = await Promise.all([
    District.find({ deletedAt: { $exists: false } }).lean(),
    findLevels(),
  ]);

  const getDistrictIdByName = (selectedDistrict: string) =>
    districts.find(district => Object.values(district.name).includes(selectedDistrict))!._id;

  // add levels if not specified
  primarySchools.forEach(school => {
    school.levels ||= primaryLevels.map(lvl => lvl._id);
  });
  secondarySchools.forEach(school => {
    school.levels ||= [...juniorLevels, ...seniorLevels].map(lvl => lvl._id);
  });
  tertiarySchools.forEach(school => {
    school.levels ||= tertiaryLevels.map(lvl => lvl._id);
  });

  const schools = [...primarySchools, ...secondarySchools, ...tertiarySchools].map(
    ({ district, name, ...rest }) =>
      new School<Partial<SchoolDocument>>({
        district: getDistrictIdByName(district),
        name: { ...name, zhCN: name.zhCN || convert.tw2cn(name.zhHK) },
        band: SCHOOL.BAND.UNSPECIFIC,
        funding: SCHOOL.FUNDING.UNSPECIFIC,
        gender: SCHOOL.FUNDING.UNSPECIFIC,
        religion: SCHOOL.RELIGION.UNSPECIFIC,
        ...rest,
      }),
  );

  await School.insertMany<Partial<SchoolDocument>>(schools, { includeResultMetadata: true });

  const intl = internationalSchools.length;
  const pri = primarySchools.length;
  const sec = secondarySchools.length;
  const ter = tertiarySchools.length;
  return `(${chalk.green(schools.length)} created  ${intl}, ${pri}, ${sec}, ${ter})`;
};

export { seed };
