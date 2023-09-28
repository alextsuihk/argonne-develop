/**
 * Seeder: Typography
 * (for all tenants)
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';
import convert from 'chinese_convert';

import type { TypographyDocument } from '../../models/typography';
import Typography from '../../models/typography';

const seed = async (): Promise<string> => {
  // const typographies: Partial<TypographyDocument>[] = [];

  const files = await fsPromises.readdir(path.join(__dirname, 'typography'), { withFileTypes: true });

  const fileContents = await Promise.all(
    files
      .filter(file => !file.name.includes('.skip.'))
      .map(async file => ({
        file: file.name.slice(0, -5),
        value: JSON.parse(await fsPromises.readFile(path.join(__dirname, 'typography', file.name), 'utf-8')) as Record<
          string,
          { title: TypographyDocument['title']; content: TypographyDocument['content'] }
        >,
      })),
  );

  const typographies = fileContents
    .map(({ file, value }) =>
      Object.entries(value).map(
        ([key, { title, content }]) =>
          new Typography<Partial<TypographyDocument>>({ key: `${file}:${key}`, title, content }),
      ),
    )
    .flat();

  typographies.forEach(typography => {
    if (typography.title?.zhHK) typography.title!.zhCN = convert.tw2cn(typography.title.zhHK);
    if (typography.content?.zhHK) typography.content!.zhCN = convert.tw2cn(typography.content.zhHK);
  });

  await Typography.insertMany<Partial<TypographyDocument>>(typographies, { rawResult: true });
  return `(${chalk.green(typographies.length)} created)`;
};

export { seed };
