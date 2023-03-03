/**
 * Seeder: Subject
 *
 * source: https://www.edb.gov.hk/en/curriculum-development/cs-curriculum-doc-report/8-key-area/index.html
 * source: https://www.hkeaa.edu.hk/en/hkdse/assessment/subject_information/
 */

import { LOCALE } from '@argonne/common';
import chalk from 'chalk';
import convert from 'chinese_convert';

import type { SubjectDocument } from '../../models/subject';
import Subject from '../../models/subject';
import { idsToString } from '../../utils/helper';
import { findLevels } from './level-seed';

const { SUBJECT } = LOCALE.DB_ENUM;

const seed = async (): Promise<string> => {
  const { naLevel, primaryLevels, juniorLevels, seniorLevels } = await findLevels();

  const primaryLevelIds = idsToString(primaryLevels);
  const juniorLevelIds = idsToString(juniorLevels);
  const seniorLevelIds = idsToString(seniorLevels);

  const subjects: Partial<SubjectDocument>[] = [
    { name: { enUS: 'Not Applicable', zhHK: '不適用', zhCN: '不适用' }, levels: [naLevel!._id], flags: [] },
    {
      name: { enUS: 'Class Teacher', zhHK: '班主任', zhCN: '班主任' },
      levels: [...primaryLevelIds, ...juniorLevelIds, ...seniorLevelIds],
    },
    { name: { enUS: 'Biology', zhHK: '生物' }, levels: [...seniorLevelIds], flags: [SUBJECT.FLAG.DSE_ELECTIVE] },
    {
      name: { enUS: 'Business, Accounting and Financial Studies', zhHK: '企業、會計與財務概論' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    { name: { enUS: 'Chemistry', zhHK: '化學' }, levels: [...seniorLevelIds] },
    {
      name: { enUS: 'Chinese History', zhHK: '中國歷史' },
      levels: [...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Chinese Language', zhHK: '中國語文', zhCN: '中国语文' },
      levels: [...primaryLevelIds, ...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_CORE],
    },
    {
      name: { enUS: 'Chinese Literature', zhHK: '中國文學' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Design and Applied Technology', zhHK: '設計與應用科技' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    { name: { enUS: 'Economics', zhHK: '經濟' }, levels: [...seniorLevelIds], flags: [SUBJECT.FLAG.DSE_ELECTIVE] },
    {
      name: { enUS: 'English Language', zhHK: '英文語文', zhCN: '英国语文' },
      levels: [...primaryLevelIds, ...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_CORE],
    },
    {
      name: { enUS: 'Ethics and Religious Studies', zhHK: '倫理與宗教' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    { name: { enUS: 'General Studies', zhHK: '常識科' }, levels: [...primaryLevelIds] },
    {
      name: { enUS: 'Geography', zhHK: '地理' },
      levels: [...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Health Management and Social Care', zhHK: '健康管理與社會關懷' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'History', zhHK: '歷史' },
      levels: [...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Information and Communication Technology', zhHK: '資訊及通訊科技' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    { name: { enUS: 'Integrated Science', zhHK: '綜合科學' }, levels: [...seniorLevelIds] },
    {
      name: { enUS: 'Liberal Studies', zhHK: '通識教育' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_CORE],
    },
    { name: { enUS: 'Life and Society', zhHK: '生活與社會' }, levels: [...juniorLevelIds] },
    {
      name: { enUS: 'Literature in English', zhHK: '英國文學' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Mathematics', zhHK: '數學' },
      levels: [...primaryLevelIds, ...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_CORE],
    },
    {
      name: { enUS: 'Music', zhHK: '音樂' },
      levels: [...primaryLevelIds, ...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Physical Education', zhHK: '體育' },
      levels: [...primaryLevelIds, ...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Physics', zhHK: '物理' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    { name: { enUS: 'Putonghua', zhHK: '普通話' }, levels: [...primaryLevelIds, ...juniorLevelIds] },
    { name: { enUS: 'Religious Education', zhHK: '宗教教育' }, levels: [...juniorLevelIds] },
    { name: { enUS: 'Science', zhHK: '科學' }, levels: [...juniorLevelIds] },
    // { name: { enUS: 'Science (Integrated Mode; Combined Mode)', zhHK: '科學 (綜合模式，組合模式)' },  levels: [...juniorLevelIds] },
    {
      name: { enUS: 'Science: Combined Science', zhHK: '科學：組合模式)' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Science: Integrated Science)', zhHK: '科學：綜合模式' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Technology and Living', zhHK: '科技與生活' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Technology Education Key Learning Area Curriculum', zhHK: '科技教育學習領域課程' },
      levels: [...juniorLevelIds],
    },
    {
      name: { enUS: 'Tourism and Hospitality Studies', zhHK: '旅遊與款待' },
      levels: [...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },
    {
      name: { enUS: 'Visual Arts', zhHK: '視覺藝術' },
      levels: [...primaryLevelIds, ...juniorLevelIds, ...seniorLevelIds],
      flags: [SUBJECT.FLAG.DSE_ELECTIVE],
    },

    // {
    //   name: {
    //     enUS: '',
    //     zhHK: '普通電腦/資訊及通訊科技',
    //     zhCN: 'Computer Literacy/ Information and Communication Technology',
    //   },
    // },

    // {
    //   name: {
    //     enUS: 'Principle of Accounts / Business, Accounting & Financial Studies',
    //     zhHK: '會計學原理/企業、會計與財務概論	',
    //     zhCN: '',
    //   },
    // },
  ];

  // add common values to array
  subjects.forEach(subject => {
    if (!subject.name?.zhCN) subject.name!.zhCN = convert.tw2cn(subject.name?.zhHK ?? '');
  });

  await Subject.create(subjects);
  return `(${chalk.green(subjects.length)} created)`;
};

export { seed };
