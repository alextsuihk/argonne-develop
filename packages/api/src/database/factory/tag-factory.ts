/**
 * Factory: Tag
 *
 */

import { faker } from '@faker-js/faker';
import chalk from 'chalk';

import Tag, { TagDocument } from '../../models/tag';

/**
 * Generate (factory)
 *
 * @param count:
 */
const fake = async (count = 40): Promise<string> => {
  const tags = Array(count)
    .fill(0)
    .map(
      _ =>
        new Tag<Partial<TagDocument>>({
          name: {
            enUS: `(ENG-Tag) ${faker.lorem.sentence(3)}`,
            zhHK: `(CHT-Tag) ${faker.lorem.sentence(3)}`,
            zhCN: `(CHS-Tag) ${faker.lorem.sentence(3)}`,
          },
          description: {
            enUS: `(ENG-Desc) ${faker.lorem.sentence(3)}`,
            zhHK: `(CHT-Desc) ${faker.lorem.sentence(3)}`,
            zhCN: `(CHS-Desc) ${faker.lorem.sentence(3)}`,
          },
        }),
    );

  await Tag.create(tags);
  return `(${chalk.green(tags.length)} created)`;
};

export { fake };