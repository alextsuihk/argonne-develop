/**
 * Seeder: Level
 *
 */

import chalk from 'chalk';
import type { Types } from 'mongoose';

import type { LevelDocument } from '../../models/level';
import Level from '../../models/level';

/**
 * Find Levels (na, primary, junior, senior)
 */
let levels: LevelDocument[] = [];
export const findLevels = async () => {
  // simple caching
  levels = levels.length
    ? levels
    : await Level.find({ deletedAt: { $exists: false } })
        .sort({ code: 1 })
        .lean();

  const naLevel = levels.find(level => level.code === 'NA');
  const teacherLevel = levels.find(level => level.code === 'TEACHER');
  const primaryLevels = levels.filter(level => ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(level.code));
  const juniorLevels = levels.filter(level => ['S1', 'S2', 'S3'].includes(level.code));
  const seniorLevels = levels.filter(level => ['S4', 'S5', 'S6'].includes(level.code));
  const tertiaryLevels = levels.filter(level => ['COLLEGE'].includes(level.code));

  if (!naLevel || !teacherLevel || primaryLevels.length !== 6 || juniorLevels.length !== 3 || seniorLevels.length !== 3)
    throw `Levels are not properly initialized`;

  return { naLevel, teacherLevel, primaryLevels, juniorLevels, seniorLevels, tertiaryLevels };
};

const rawLevels: (Pick<LevelDocument, 'code' | 'name'> & { hasNextLevel?: boolean })[] = [
  { code: 'NA', name: { enUS: 'Not Applicable', zhHK: '不適用', zhCN: '不适用' } },
  { code: 'TEACHER', name: { enUS: 'Teacher', zhHK: '現役老師', zhCN: '现役老师' } },
  // { code: 'tutor', name: { enUS: 'Tutor', zhHK: '補習導師', zhCN: '补习导师' } },

  { code: 'P1', name: { enUS: 'Primary 1', zhHK: '小一', zhCN: '小一' }, hasNextLevel: true },
  { code: 'P2', name: { enUS: 'Primary 2', zhHK: '小二', zhCN: '小二' }, hasNextLevel: true },
  { code: 'P3', name: { enUS: 'Primary 3', zhHK: '小三', zhCN: '小三' }, hasNextLevel: true },
  { code: 'P4', name: { enUS: 'Primary 4', zhHK: '小四', zhCN: '小四' }, hasNextLevel: true },
  { code: 'P5', name: { enUS: 'Primary 5', zhHK: '小五', zhCN: '小五' }, hasNextLevel: true },
  { code: 'P6', name: { enUS: 'Primary 6', zhHK: '小六', zhCN: '小六' } },
  { code: 'S1', name: { enUS: 'Secondary 1', zhHK: '中一', zhCN: '中一' }, hasNextLevel: true },
  { code: 'S2', name: { enUS: 'Secondary 2', zhHK: '中二', zhCN: '中二' }, hasNextLevel: true },
  { code: 'S3', name: { enUS: 'Secondary 3', zhHK: '中三', zhCN: '中三' }, hasNextLevel: true },
  { code: 'S4', name: { enUS: 'Secondary 4', zhHK: '中四', zhCN: '中四' }, hasNextLevel: true },
  { code: 'S5', name: { enUS: 'Secondary 5', zhHK: '中五', zhCN: '中五' }, hasNextLevel: true },
  { code: 'S6', name: { enUS: 'Secondary 6', zhHK: '中六', zhCN: '中六' } },
];

const seed = async (): Promise<string> => {
  // generate _id first, then reverse levels, because we need to optionally append nextLevel
  let nextLevel: Types.ObjectId | undefined;
  const levels = rawLevels.reverse().map(({ hasNextLevel, ...fields }) => {
    const level = new Level<Partial<LevelDocument>>({ ...fields, ...(hasNextLevel && { nextLevel }) });
    nextLevel = level._id;
    return level;
  });

  await Level.insertMany<Partial<LevelDocument>>(levels, { includeResultMetadata: true });
  return `(${chalk.green(levels.length)} created)`;
};

export { seed };
