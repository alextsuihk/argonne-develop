/**
 * Factory: Publisher
 *
 * note: publisher has no admins
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { LOCALE } from '@argonne/common';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import Publisher, { PublisherDocument } from '../../models/publisher';
import User from '../../models/user';
import { randomString, shuffle } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';

const { USER } = LOCALE.DB_ENUM;

/**
 * Generate (factory)
 *
 */
const fake = async (count = 10): Promise<string> => {
  const [publisherLogoImage, activeUsers] = await Promise.all([
    fsPromises.readFile(path.join(__dirname, 'images', 'logo-demo-1.png')),
    User.find({ status: USER.STATUS.ACTIVE, isJest: { $ne: true }, roles: { $nin: [USER.ROLE.ADMIN] } }).lean(),
  ]);
  const publisherLogoFilename = randomString('png');

  const publishers = Array(count)
    .fill(0)
    .map(
      _ =>
        new Publisher<Partial<PublisherDocument>>({
          admins: activeUsers
            .sort(shuffle)
            .slice(0, 3)
            .map(u => u._id),
          name: {
            enUS: `(ENG-Tenant) ${faker.lorem.sentence(3)}`,
            zhCN: `(CHS-Tenant) ${faker.lorem.sentence(3)}`,
            zhHK: `(CHT-Tenant) ${faker.lorem.sentence(3)}`,
          },
          phones: [faker.phone.number('+852 8#######')],
          logoUrl: `/${publicBucket}/${publisherLogoFilename}`,
          website: faker.internet.url(),
        }),
    );

  await Promise.all([
    Publisher.create(publishers),
    minioClient.putObject(publicBucket, publisherLogoFilename, publisherLogoImage),
  ]);

  return `(${chalk.green(publishers.length)} created)`;
};

export { fake };
