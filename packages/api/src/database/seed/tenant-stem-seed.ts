/**
 * Seeder: STEM tenant
 *
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { LOCALE } from '@argonne/common';
import chalk from 'chalk';

import type { TenantDocument } from '../../models/tenant';
import Tenant from '../../models/tenant';
import User from '../../models/user';
import { randomString } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';
import { addUsersToTenant } from './user-core-seed';

const { TENANT } = LOCALE.DB_ENUM;
const { CHAT_GROUP, CLASSROOM, QUESTION, TUTOR } = TENANT.SERVICE;

const seed = async (): Promise<string> => {
  const [logoImage, { alexId }] = await Promise.all([
    fsPromises.readFile(path.join(__dirname, 'images', 'logo-stem.png')),
    User.findSystemAccountIds(),
  ]);

  const logoFilename = randomString('png');
  const htmlFilename = randomString('html');

  const tenant = new Tenant<Partial<TenantDocument>>({
    code: 'STEM',
    name: { enUS: 'STEM.Inspire.HK', zhHK: 'STEM.Inspire.HK', zhCN: 'STEM.Inspire.HK' },
    admins: [alexId],
    services: [CHAT_GROUP, CLASSROOM, QUESTION, TUTOR],
    htmlUrl: `/${publicBucket}/${htmlFilename}`,
    logoUrl: `/${publicBucket}/${logoFilename}`,
    flaggedWords: [],
  });

  const html = `
  <h1>TODO, Please convert to html </h1>
    homePage: {
      slogan: {
        enUS: 'Train the next generation of engineers & scientists for the requirement in 5~10 years',
        zhHK: 'STEM slogan',
        zhCN: 'STEM slogan',
      },
      contact: 'Alex',
      htmlTexts: [
        [
          { enUS: 'General Rules', zhHK: '原則' },
          { enUS: '1. Project must be open-source (exception could be granted for special case).', zhHK: 'TODO' },
          { enUS: '2. Pass the red-face test', zhHK: 'TODO' },
          {
            enUS: '3. Applicable to hardware only, I do not support design with Lithium unless satisfied with your math & circuit design.',
            zhHK: 'TODO',
          },
        ],
        [
          { enUS: 'Target Students', zhHK: '目標學生' },
          { enUS: 'WARNING: This is not an interest nor hobby class.', zhHK: 'TODO' },
          {
            enUS: 'no prerequisite, you need know to have any computer programming or hardware design',
            zhHK: 'TODO',
          },
          { enUS: 'junior secondary or university student', zhHK: 'TODO' },
          { enUS: 'We could organize special sessions to students after DSE examination.', zhHK: 'TODO' },
          { enUS: 'primary students are welcome, but assessment is needed.', zhHK: 'TODO' },
          {
            enUS: 'I could speak &amp; write in Chinese (Cantonese & Mandarin) &amps English. However, English is our primary &amp; preferred language.',
            zhHK: 'TODO',
          },
        ],
        [
          { enUS: 'Hardware: WiFi, Bluetooth, USB on Raspberry Pi & Arduino', zhHK: 'TODO' },
          { enUS: 'Focus Technologies', zhHK: '主要技術' },
          { enUS: 'Python: analytics, big data & visualization', zhHK: 'TODO' },
          { enUS: 'Web: (MERN stack) NodeJS, database. GoLang will be included', zhHK: 'TODO' },
          { enUS: 'Android & iOS App: primary focus is Flutter', zhHK: 'TODO' },
        ],
        // [
        //   { enUS: 'Your idea' },
        //   {
        //     enUS: 'If you have an idea, just propose it, we will formulate a path to achieve it, including forming team.',
        //   },
        // ],
        [
          { enUS: 'Approach', zhHK: 'TODO' },
          {
            enUS: 'Fundamental skills will be taught via video lecture. You should follow and duplicate the work.',
            zhHK: 'TODO',
          },
          {
            enUS: 'You could ask questions online. For complicated topics, Skype will be used. (all tutoring sessions will be recorded.)',
            zhHK: 'TODO',
          },
          { enUS: 'Industry approach: You learn by taking on projects.', zhHK: 'TODO' },
          { enUS: 'Individual project: strictly follow best-practice & convention', zhHK: 'TODO' },
          { enUS: 'Team Project: no preset rule, only one success indicator is 125% effectiveness', zhHK: 'TODO' },
        ],
      ],
    },
  `;
  await Promise.all([
    addUsersToTenant([alexId], tenant._id),
    minioClient.putObject(publicBucket, logoFilename, logoImage),
    minioClient.putObject(publicBucket, htmlFilename, html),

    tenant.save(),
  ]);

  return `(${chalk.green('Stem tenant')} created)`;
};

export { seed };
