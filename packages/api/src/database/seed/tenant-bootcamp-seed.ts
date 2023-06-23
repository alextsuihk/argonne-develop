/**
 * Seeder: Bootcamp tenant
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
import { addTenantToUsers } from '../helper';

const { TENANT } = LOCALE.DB_ENUM;
const { CHAT_GROUP, QUESTION } = TENANT.SERVICE;

const seed = async (): Promise<string> => {
  const [logoImage, { alexId }] = await Promise.all([
    fsPromises.readFile(path.join(__dirname, 'images', 'logo-bootcamp.png')),
    User.findSystemAccountIds(),
  ]);
  const logoFilename = randomString('png');

  const tenant = new Tenant<Partial<TenantDocument>>({
    code: 'BOOTCAMP',
    name: { enUS: 'Bootcamp.HK', zhHK: 'Bootcamp.HK', zhCN: 'Bootcamp.HK' },
    services: [CHAT_GROUP, QUESTION],
    admins: [alexId],
    logoUrl: `/${publicBucket}/${logoFilename}`,
    website: 'https://www.bootcamp.hk',

    flaggedWords: [],
  });

  await Promise.all([
    minioClient.putObject(publicBucket, logoFilename, logoImage),
    tenant.save(),
    addTenantToUsers([alexId], tenant._id),
  ]);

  return `(${chalk.green('Bootcamp tenant')} created)`;
};

export { seed };
