/**
 * Seeder: Tutor tenant
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
const { CHAT_GROUP, QUESTION, QUESTION_BID, TUTOR } = TENANT.SERVICE;

const seed = async (): Promise<string> => {
  const [logoImage, { alexId }] = await Promise.all([
    fsPromises.readFile(path.join(__dirname, 'images', 'logo-tutor.png')),
    User.findSystemAccountIds(),
  ]);

  const logoFilename = randomString('png');
  const tenant = new Tenant<Partial<TenantDocument>>({
    code: 'TUTOR',
    name: { enUS: 'Homework Tutoring', zhHK: '功課幫手', zhCN: '功课帮手' },
    admins: [alexId],
    services: [CHAT_GROUP, QUESTION, QUESTION_BID, TUTOR],
    logoUrl: `/${publicBucket}/${logoFilename}`,
    flaggedWords: [],
  });

  await Promise.all([
    addUsersToTenant([alexId], tenant._id),
    minioClient.putObject(publicBucket, logoFilename, logoImage),
    tenant.save(),
  ]);

  return `(${chalk.green('Tutor tenant')} created)`;
};

export { seed };
