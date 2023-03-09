/**
 * Factory: Create fake tenant () & users
 *
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import { addDays } from 'date-fns';

import configLoader from '../../config/config-loader';
import District from '../../models/district';
import type { SchoolDocument } from '../../models/school';
import School from '../../models/school';
import type { TenantDocument } from '../../models/tenant';
import Tenant from '../../models/tenant';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { idsToString, randomId, randomString, shuffle } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';
import { findLevels } from '../seed/level-seed';

const { TENANT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

/**
 * Generate (factory)
 *
 */
const fake = async (code: string, assignedServices: string[], levelGroups?: string[]): Promise<string> => {
  const logoFile = code === 'JEST' ? 'logo-jest.png' : ['logo-demo-1.png', 'logo-demo-2.png'].sort(shuffle)[0]!;
  const website = code === 'JEST' ? `http://127.0.0.1` : `https://school.${code.toLowerCase()}.edu.hk`;

  const allServices = Object.keys(TENANT.SERVICE);
  const services = assignedServices.length ? allServices.filter(x => assignedServices.includes(x)) : allServices;

  const [districts, logoImage, { primaryLevels, juniorLevels, seniorLevels }] = await Promise.all([
    District.find({ deletedAt: { $exists: false } }).lean(),
    fsPromises.readFile(path.join(__dirname, 'images', logoFile)),
    findLevels(),
  ]);

  // Part1: create school & tenant
  const levels = [
    ...(levelGroups?.includes('primary') ? idsToString(primaryLevels) : []),
    ...(levelGroups?.includes('junior') ? idsToString(juniorLevels) : []),
    ...(levelGroups?.includes('senior') ? idsToString(seniorLevels) : []),
  ];
  const logoFilename = randomString('png');
  const school = levelGroups?.length
    ? new School<Partial<SchoolDocument>>({
        code,
        name: { enUS: code, zhCN: `${code}-CHT`, zhHK: `${code}-CHS` },
        district: randomId(districts)!,
        phones: [faker.phone.number('+852 3#######')],
        logoUrl: `/${publicBucket}/${logoFilename}`,
        website,
        levels,
      })
    : null;

  const tenant = new Tenant<Partial<TenantDocument>>({
    code,
    name: { enUS: code, zhCN: `${code}-CHT`, zhHK: `${code}-CHS` },
    ...(school && { school: school._id }),
    services,
    logoUrl: `/${publicBucket}/${logoFilename}`,
    website,
  });

  // Part2: create tenantAdmins & other users
  const tenantAdmins = Array(2) // 2 tenantAdmins are needed to JEST test (1 for apollo, 1 for REST, testing in parallel)
    .fill(0)
    .map(
      (_, idx) =>
        new User<Partial<UserDocument>>({
          status: USER.STATUS.ACTIVE,
          tenants: [tenant._id],
          flags: DEFAULTS.USER.FLAGS,
          name: `${code} tenantAdmin (${idx + 1})`,
          formalName: { enUS: `${code}-${idx}`, zhCN: `${code}-${idx}`, zhHK: `${code}-${idx}` },
          scopes: ['systems:r'],
          emails: [`${code.toLowerCase()}-tenant-admin${idx}@${DEFAULTS.DOMAIN}`],
          password: User.genValidPassword(`${code}_`),
          identifiedAt: new Date(),
        }),
    );

  const otherUsers =
    code === 'JEST'
      ? [
          new User<Partial<UserDocument>>({
            status: USER.STATUS.DELETED,
            name: 'Deleted Test User',
            flags: DEFAULTS.USER.FLAGS,
            emails: [`${code}-deleted@${DEFAULTS.DOMAIN}@@seed`],
            identifiedAt: new Date(),
            deletedAt: new Date(),
          }),
          new User<Partial<UserDocument>>({
            status: USER.STATUS.ACTIVE,
            suspension: addDays(Date.now(), DEFAULTS.USER.SUSPENSION_DAY),
            name: 'Suspended Test User',
            flags: DEFAULTS.USER.FLAGS,
            emails: [`${code}-suspended@${DEFAULTS.DOMAIN}`],
            roles: [],
            identifiedAt: new Date(),
          }),
        ]
      : [];

  tenant.admins = idsToString(tenantAdmins); // add tenantAdmins

  const [users] = await Promise.all([
    User.create([...tenantAdmins, ...otherUsers]), // must use create() to execute pre-save hook for password-hashing
    minioClient.putObject(publicBucket, logoFilename, logoImage),
    school && school.save(),
    tenant.save(),
  ]);

  return `(${code} (services: ${services}) with ${chalk.green(users.length)} users created)`;
};

export { fake };
