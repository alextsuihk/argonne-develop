/**
 * Seeder: Avatar
 *
 * load image files (jpg, png, etc) from ./avatar directory & generate a avatars.json
 *
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';
import sharp from 'sharp';

import { randomString, shuffle } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';

const seed = async (): Promise<string> => {
  const srcPath = path.join(__dirname, 'avatar');

  // read filenames from source directory
  const avatars = await fsPromises.readdir(srcPath, { withFileTypes: true });

  const builtinAvatars: string[] = await Promise.all(
    avatars.sort(shuffle).map(async ({ name }) => {
      const objectName = `avatar-${randomString(path.extname(name).slice(1))}`; // remove the "."

      const image = await fsPromises.readFile(path.join(srcPath, name));
      const resizeImage = sharp(image).resize({ width: 192, height: 192, fit: 'inside' });
      await minioClient.putObject(publicBucket, objectName, resizeImage);
      // await minioClient.putObject(publicBucket, objectName, fs.createReadStream(path.join(srcPath, name))); // without resizing
      return `/${publicBucket}/${objectName}`;
    }),
  );

  await minioClient.putObject(publicBucket, 'avatars.json', JSON.stringify(builtinAvatars));
  return `(${chalk.green(avatars.length)} created)`;
};

export { seed };
