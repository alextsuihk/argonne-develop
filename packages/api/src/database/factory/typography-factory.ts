/**
 * Factory: Typography
 * (for tenant customization)
 */

import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import Tenant from '../../models/tenant';
import Typography from '../../models/typography';
import { randomItems, shuffle } from '../../utils/helper';

/**
 * Generate (factory)
 *
 * @param codes: tenantCodes
 * @param probability: some tenant have custom typographies
 */
const fake = async (codes: string[], probability: 0.5): Promise<string> => {
  let total = 0;

  const [tenants, typographies] = await Promise.all([
    Tenant.find({ ...(codes.length && { code: { $in: codes } }), deletedAt: { $exists: false } }).lean(),
    Typography.find({ deletedAt: { $exists: false } }),
  ]);

  tenants.sort(shuffle).forEach(tenant => {
    const selectedTypographies = randomItems(typographies, Math.floor(typographies.length * probability));

    selectedTypographies.forEach(typography => {
      total++;
      typography.customs.push({
        tenant: tenant._id,
        title: {
          enUS: `(ENG-Tenant) ${faker.lorem.sentence(3)}`,
          zhHK: `(CHT-Tenant) ${faker.lorem.sentence(3)}`,
          zhCN: `(CHS-Tenant) ${faker.lorem.sentence(3)}`,
        },
        content: {
          enUS: `(ENG-Tenant) ${faker.lorem.sentence(3)}`,
          zhHK: `(CHT-Tenant) ${faker.lorem.sentence(3)}`,
          zhCN: `(CHS-Tenant) ${faker.lorem.sentence(3)}`,
        },
      });
    });
  });

  await Promise.all(typographies.filter(t => t.customs.length).map(async t => t.save()));
  return `(${chalk.green(total)} custom typographies created for ${chalk.green(tenants.length)} tenants)`;
};

export { fake };
