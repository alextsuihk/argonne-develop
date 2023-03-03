/**
 * Seeder: District
 *
 */

import type { Locale } from '@argonne/common';
import chalk from 'chalk';

import District, { DistrictDocument } from '../../models/district';

const regionDistricts: { region: Locale; districts: Locale[] }[] = [
  {
    region: { enUS: 'Hong Kong Region', zhHK: '港島區域', zhCN: '港岛区域' },
    districts: [
      { enUS: 'Central & Western', zhHK: '中西區', zhCN: '中西区' },
      { enUS: 'Wanchai', zhHK: '灣仔區', zhCN: '湾仔区' },
      { enUS: 'Hong Kong East', zhHK: '東區', zhCN: '东区' },
      { enUS: 'Southern', zhHK: '南區', zhCN: '南区' },
    ],
  },
  {
    region: { enUS: 'Kowloon Region', zhHK: '九龍區域', zhCN: '九龙区域' },
    districts: [
      { enUS: 'Yau Tsim & Mong Kok', zhHK: '油尖旺區', zhCN: '油尖旺区' },
      { enUS: 'Sham Shui Po', zhHK: '深水埗區', zhCN: '深水埗区' },
      { enUS: 'Kowloon City', zhHK: '九龍城區', zhCN: '九龙城区' },
      { enUS: 'Wong Tai Sin', zhHK: '黃大仙區', zhCN: '黄大仙区' },
      { enUS: 'Kwun Tong', zhHK: '觀塘區', zhCN: '观塘区' },
    ],
  },
  {
    region: { enUS: 'New Territories Region', zhHK: '新界區域', zhCN: '新界区域' },
    districts: [
      { enUS: 'Kwai Tsing', zhHK: '葵青區', zhCN: '葵青区' },
      { enUS: 'Tsuen Wan', zhHK: '荃灣區', zhCN: '荃湾区' },
      { enUS: 'Tuen Mun', zhHK: '屯門區', zhCN: '屯门区' },
      { enUS: 'Yuen Long', zhHK: '元朗區', zhCN: '元朗区' },
      { enUS: 'North', zhHK: '北區', zhCN: '北区' },
      { enUS: 'Tai Po', zhHK: '大埔區', zhCN: '大埔区' },
      { enUS: 'Shatin', zhHK: '沙田區', zhCN: '沙田区' },
      { enUS: 'Sai Kung', zhHK: '西貢區', zhCN: '西贡区' },
      { enUS: 'Islands', zhHK: '離島區', zhCN: '离岛区' },
    ],
  },
];

/**
 * re-format structure to fit model structure
 */
const districts = regionDistricts
  .map(({ region, districts }) =>
    districts.map(district => new District<Partial<DistrictDocument>>({ region, name: district })),
  )
  .flat();

const seed = async (): Promise<string> => {
  await District.create(districts);
  return `(${chalk.green(districts.length)} created)`;
};

export { seed };
