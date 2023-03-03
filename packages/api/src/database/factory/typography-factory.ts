/**
 * Factory: Typography
 * (for tenant customization)
 */

import { faker } from '@faker-js/faker';
import chalk from 'chalk';
import mongoose from 'mongoose';

import Tenant from '../../models/tenant';
import Typography from '../../models/typography';
import { shuffle } from '../../utils/helper';

/**
 * Generate (factory)
 *
 */
const fake = async (probability: 0.5): Promise<string> => {
  let total = 0;

  const [tenants, typographies] = await Promise.all([
    Tenant.find({ deletedAt: { $exists: false } }).lean(),
    Typography.find({ deletedAt: { $exists: false } }),
  ]);

  const selectedTypographies = typographies.sort(shuffle).slice(0, Math.floor(typographies.length * probability));
  for (const typography of selectedTypographies) {
    const selectedTenants = tenants.sort(shuffle).slice(0, Math.floor(tenants.length * Math.random()));
    total += selectedTenants.length;

    typography.customs = selectedTenants.map(tenant => ({
      _id: new mongoose.Types.ObjectId().toString(),
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
    }));
  }

  await Promise.all(selectedTypographies.filter(t => t.customs.length).map(t => t.save()));
  return `(${chalk.green(total)} (${selectedTypographies.length} typographies) created)`;
};

export { fake };
