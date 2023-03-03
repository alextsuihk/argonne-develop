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
  const typographies: Partial<TypographyDocument>[] = [];

  const files = await fsPromises.readdir(path.join(__dirname, 'typography'), { withFileTypes: true });
  await Promise.all(
    files
      .filter(file => !file.name.includes('.skip.'))
      .map(async file => {
        // const typography = JSON.parse(fs.readFileSync(path.join(__dirname, 'typography', file.name), 'utf-8'));
        const typography = JSON.parse(
          await fsPromises.readFile(path.join(__dirname, 'typography', file.name), 'utf-8'),
        );
        for (const [key, value] of Object.entries(typography)) {
          const { title, content } = value as {
            title: TypographyDocument['title'];
            content: TypographyDocument['content'];
          };
          typographies.push({ key: `${file.name.slice(0, -5)}:${key}`, title, content });
        }
      }),
  );

  typographies.forEach(typography => {
    if (typography.title?.zhHK) typography.title!.zhCN = convert.tw2cn(typography.title.zhHK);
    if (typography.content?.zhHK) typography.content!.zhCN = convert.tw2cn(typography.content.zhHK);
  });

  await Typography.create(typographies);
  return `(${chalk.green(typographies.length)} created)`;
};

export { seed };