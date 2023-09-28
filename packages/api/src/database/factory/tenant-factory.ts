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
import { randomItem, randomString } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';
import { findLevels } from '../seed/level-seed';

const { SCHOOL, TENANT, USER } = LOCALE.DB_ENUM;
const { DEFAULTS } = configLoader;

/**
 * Generate (factory)
 *
 * for school (with levelGroups), enable satellite
 *
 */
const fake = async (code: string, assignedServices: string[], levelGroups?: string[]): Promise<string> => {
  const logoFile = code === 'JEST' ? 'logo-jest.png' : randomItem(['logo-demo-1.png', 'logo-demo-2.png']);
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
    ...(levelGroups?.includes('primary') ? primaryLevels : []),
    ...(levelGroups?.includes('junior') ? juniorLevels : []),
    ...(levelGroups?.includes('senior') ? seniorLevels : []),
  ].map(l => l._id);

  const logoFilename = randomString('png');
  const school = levelGroups?.length
    ? new School<Partial<SchoolDocument>>({
        code,
        name: { enUS: code, zhCN: `${code}-CHT`, zhHK: `${code}-CHS` },
        district: randomItem(districts)._id,
        phones: [faker.phone.number('+852 3#######')],
        band: SCHOOL.BAND.UNSPECIFIC,
        logoUrl: `/${publicBucket}/${logoFilename}`,
        website,
        funding: SCHOOL.FUNDING.UNSPECIFIC,
        gender: SCHOOL.FUNDING.UNSPECIFIC,
        religion: SCHOOL.RELIGION.UNSPECIFIC,
        levels,
      })
    : null;

  const tenant = new Tenant<Partial<TenantDocument>>({
    code,
    name: { enUS: code, zhCN: `${code}-CHT`, zhHK: `${code}-CHS` },
    ...(school && {
      apiKey: randomString(),
      school: school._id,
      satelliteUrl: `https://lean.${code.toLowerCase()}.edu.hk`,
    }),
    services,
    logoUrl: `/${publicBucket}/${logoFilename}`,
    website,
  });

  // Part2: create tenantAdmins & other admin users
  const genUsers = (type: 'admin' | 'support' | 'counselor' | 'marshal') =>
    Array(2)
      .fill(0)
      .map(
        (_, idx) =>
          new User<Partial<UserDocument>>({
            status: USER.STATUS.ACTIVE,
            tenants: [tenant._id],
            flags: DEFAULTS.USER.FLAGS,
            name: `${code} ${type} (${idx + 1})`,
            formalName: { enUS: `${code}-${idx}`, zhCN: `${code}-${idx}`, zhHK: `${code}-${idx}` },
            emails: [`${code.toLowerCase()}-${type}-${idx}@${DEFAULTS.DOMAIN}`],
            password: User.genValidPassword(`${code}_`),
            identifiedAt: new Date(),
          }),
      );

  const tenantAdmins = genUsers('admin'); // 2 tenantAdmins are needed to JEST test (1 for apollo, 1 for REST, testing in parallel)
  const tenantSupports = genUsers('support');
  const tenantCounselors = genUsers('counselor');
  const tenantMarshals = genUsers('marshal');

  const otherJestUsers =
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
            suspendUtil: addDays(Date.now(), DEFAULTS.USER.SUSPENSION_DAY),
            name: 'Suspended Test User',
            flags: DEFAULTS.USER.FLAGS,
            emails: [`${code}-suspended@${DEFAULTS.DOMAIN}`],
            roles: [],
            identifiedAt: new Date(),
          }),
        ]
      : [];

  tenant.admins = tenantAdmins.map(u => u._id); // add tenantAdmins
  tenant.supports = tenantSupports.map(u => u._id);
  tenant.counselors = tenantCounselors.map(u => u._id);
  tenant.marshals = tenantMarshals.map(u => u._id);

  const [users] = await Promise.all([
    User.create<Partial<UserDocument>>([
      ...tenantAdmins,
      ...tenantSupports,
      ...tenantCounselors,
      ...tenantMarshals,
      ...otherJestUsers,
    ]), // must use create() to execute pre-save hook for password-hashing (note: hashing is slow)
    minioClient.putObject(publicBucket, logoFilename, logoImage),
    school && school.save(),
    tenant.save(),
  ]);

  return `(${code} [services: ${services}] with ${chalk.green(users.length)} users created)`;
};

export { fake };
