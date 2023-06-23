/**
 * Seeder: Cascade tenant
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
const { AUTH_SERVICE } = TENANT.SERVICE;

const seed = async (): Promise<string> => {
  const [logoImage, { alexId }] = await Promise.all([
    fsPromises.readFile(path.join(__dirname, 'images', 'logo-cascade.png')),
    User.findSystemAccountIds(),
  ]);
  const logoFilename = randomString('png');

  const tenant = new Tenant<Partial<TenantDocument>>({
    apiKey: randomString(),
    code: 'CASCADE',
    name: { enUS: 'Used Book Waterfall', zhHK: '舊書轉讓', zhCN: '旧书转让' },
    services: [AUTH_SERVICE],
    admins: [alexId],
    logoUrl: `/${publicBucket}/${logoFilename}`,
    website: 'https://book.inspire.hk',

    flaggedWords: [],
    userSelect: '_id tenants name password avatarUrl school studentId schoolClass level',
  });

  await Promise.all([
    minioClient.putObject(publicBucket, logoFilename, logoImage),
    tenant.save(),
    addTenantToUsers([alexId], tenant._id),
  ]);

  return `(${chalk.green('Cascade tenant')} created)`;
};

export { seed };
