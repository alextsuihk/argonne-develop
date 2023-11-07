/**
 * Factory: Publisher
 *
 * note: publisher has no admins
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import type { PublisherDocument } from '../../models/publisher';
import Publisher from '../../models/publisher';
import type { UserDocument } from '../../models/user';
import User from '../../models/user';
import { prob, randomString } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';

/**
 * Generate (factory)
 *
 */
const fake = async (count = 10): Promise<string> => {
  const publisherLogoImage = await fsPromises.readFile(path.join(__dirname, 'images', 'logo-demo-1.png'));
  const publisherLogoFilename = randomString('png');

  // publisherAdmins likely don't have tenants
  const publisherAdmins = Array(count * 2)
    .fill(0)
    .map(
      (_, idx) =>
        new User<Partial<UserDocument>>({
          name: `publisherAdmin ${idx}`,
          emails: [faker.internet.email({ firstName: `publisherAdmin-${idx}` }).toUpperCase()],
          password: User.genValidPassword(),
        }),
    );

  const publishers = Array(count)
    .fill(0)
    .map(
      (_, idx) =>
        new Publisher<Partial<PublisherDocument>>({
          admins: publisherAdmins.map(a => a._id).slice(idx * 2, idx * 2 + 2),
          name: {
            enUS: `(ENG-Tenant) ${faker.lorem.sentence(3)}`,
            zhCN: `(CHS-Tenant) ${faker.lorem.sentence(3)}`,
            zhHK: `(CHT-Tenant) ${faker.lorem.sentence(3)}`,
          },
          phones: [`+852 ${faker.number.int({ min: 30000000, max: 30009999 })}`],
          ...(prob(0.5) && { logoUrl: `/${publicBucket}/${publisherLogoFilename}` }),
          ...(prob(0.5) && { website: faker.internet.url() }),
        }),
    );

  await Promise.all([
    Publisher.insertMany<Partial<PublisherDocument>>(publishers, { includeResultMetadata: true }),
    User.insertMany<Partial<UserDocument>>(publisherAdmins, { includeResultMetadata: true }),
    minioClient.putObject(publicBucket, publisherLogoFilename, publisherLogoImage),
  ]);

  return `(${chalk.green(publishers.length)} publishers created)`;
};

export { fake };
