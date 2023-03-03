/**
 * Seeder: School
 *
 * source: https://www.edb.gov.hk/en/edu-system/primary-secondary/spa-systems/secondary-spa/general-info/secondary-sch-list.html
 */

import chalk from 'chalk';
import convert from 'chinese_convert';

import District from '../../models/district';
import type { SchoolDocument } from '../../models/school';
import School from '../../models/school';
import { idsToString } from '../../utils/helper';
import { findLevels } from './level-seed';
import { internationalSchools, primarySchools, secondarySchools, tertiarySchools } from './school-data';

const seed = async (): Promise<string> => {
  // get ALL districts info
  const [districts, { primaryLevels, juniorLevels, seniorLevels, tertiaryLevels }] = await Promise.all([
    District.find({ deletedAt: { $exists: false } }).lean(),
    findLevels(),
  ]);

  const getDistrictIdByName = (selectedDistrict: string): string =>
    districts.find(district => Object.values(district.name).includes(selectedDistrict))!._id.toString();

  // TODO:
  console.log('"school-seed" >>>>>>>>>>>>>>> TODO: number of international schools: ', internationalSchools.length);

  // add levels if not specified
  primarySchools.forEach(school => {
    school.levels ||= idsToString(primaryLevels);
  });
  secondarySchools.forEach(school => {
    school.levels ||= idsToString([...juniorLevels, ...seniorLevels]);
  });
  tertiarySchools.forEach(school => {
    school.levels ||= idsToString(tertiaryLevels);
  });

  const schools = [...primarySchools, ...secondarySchools, ...tertiarySchools].map(
    ({ district, name, ...rest }) =>
      new School<Partial<SchoolDocument>>({
        district: getDistrictIdByName(district!),
        name: { ...name, zhCN: name.zhCN ?? convert.tw2cn(name.zhHK) },
        ...rest,
      }),
  );

  await School.create(schools);
  return `(${chalk.green(schools.length)} created)`;
};

export { seed };
