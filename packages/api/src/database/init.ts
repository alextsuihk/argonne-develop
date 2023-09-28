/* eslint-disable no-console */

/**
 * Mongoose Migration: Seeder & Factory
 *
 * syntax: $ yarn database [--minio] [--drop] [--seed] [--fake] [--jest] [--demo] [--migrate]
 * ! seed & factory will be executed in sequential order
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

import chalk from 'chalk';
import mongoose from 'mongoose';

import configLoader from '../config/config-loader';
import type { MigrationDocument } from '../models/migration';
import Migration from '../models/migration';
import User from '../models/user';
import { isProdMode } from '../utils/environment';
import type { BucketItem } from '../utils/storage';
import { buckets } from '../utils/storage';
import { client as minioClient, REGION } from '../utils/storage';

const { config } = configLoader;
const { privateBucket, publicBucket } = config.server.minio;

const seeders = [
  'avatar',
  'district',
  'level',
  'subject',
  'school',
  'publisher',
  'typography',
  'tag',
  'user-core',
  'tenant-tutor',
  'tenant-stem',
  'activity-chat-stem',
];

const jestFaker = ['tenant', 'JEST', [], ['junior']];
const demoFakers = [
  ['tenant', 'HARVARD', ['CHAT_GROUP', 'CLASSROOM'], ['junior']], // demo secondary school
  ['tenant', 'A-PLUS', ['CHAT_GROUP', 'TUTOR']], // no levelGroups for tutoring school
];

const factory = (argv: string[]) =>
  argv.includes('--fake') || argv.includes('jest') || argv.includes('demo') || argv.includes('system-tutor')
    ? [
        ['tag', 50],
        ['publisher', 10],
        ...(argv.includes('--system-tutors') ? [['system-tutor']] : []),
        ...(argv.includes('--jest') ? [jestFaker] : []),
        ...(argv.includes('--demo') ? demoFakers : []),
        ['typography', [], 0.4],
        ['user', [], 25, 20, 50, 10],
        ['book', 200, 3, 10, 5], // after user-factory (because of contribution), before school-course
        ['tutor', [], 0.2, 3],
        ['school-course', [], 2],
        ['chat-group', [], 5, 4, 4],
        ['classroom', [], 3, 5, 5],
        ['announcement', [], 10, 2],
        ['question', [], 2, 5, 5],
      ]
    : [];

/**
 * Drop Database, optionally Seed & Factory
 *
 * @param argv : array of arguments: --seed, --fake
 */
const sync = async (argv: string[]): Promise<void> => {
  try {
    await mongoose.connect(config.server.mongo.url, { minPoolSize: 5, maxPoolSize: 20 });
    // mongoose.set('debug', true);

    //! sanity check: NOT ALLOW to re-initialize in production mode
    if (isProdMode) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      await new Promise<void>((resolve, reject) => {
        rl.question(
          'You are initializing Minio & Mongo database in PRODUCTION MODE. ARE YOU SURE (enter "YES") ?',
          confirm => (confirm === 'YES' ? resolve() : reject('Abort database initialization')),
        );
      });
    }

    console.time('database init');

    // create minio buckets (clean all objects if bucket exist)
    if (argv.includes('--minio')) {
      const removeBucketObjects = async (bucketName: string) => {
        const objectNames: string[] = [];

        await new Promise((resolve, reject) => {
          const stream = minioClient.listObjectsV2(bucketName);
          stream.on('data', (obj: BucketItem) => objectNames.push(obj.name));
          stream.on('end', resolve);
          stream.on('error', reject);
        });

        if (isProdMode && objectNames.length) {
          console.log(chalk.red(`Bucket ${bucketName} is NOT empty. Are you sure to re-initialize in Production Mode`));
          throw 'Please manually delete bucket before proceeding.';
        }
        await minioClient.removeObjects(bucketName, objectNames);
      };

      console.log('------------------------------------------------------------ ');
      console.log(chalk.red(`All minio buckets are re-created !!! (${privateBucket}, ${publicBucket}) \n`));
      await Promise.all(
        buckets.map(async bucket =>
          (await minioClient.bucketExists(bucket))
            ? removeBucketObjects(bucket)
            : minioClient.makeBucket(bucket, REGION),
        ),
      );
    }

    if (isProdMode && (await User.findOne())) {
      console.log(chalk.red('USER Database is NOT empty. Are you sure to re-initialize in Production Mode'));
      throw 'Please manually drop collections before proceeding.';
    }

    // drop database
    if (argv.includes('--drop')) {
      console.log('------------------------------------------------------------ ');
      try {
        // await mongoose.connection.dropDatabase(); // required root privilege
        const collections = await mongoose.connection.db.listCollections().toArray();
        await Promise.all(collections.map(collection => mongoose.connection.dropCollection(collection.name)));

        console.log(chalk.red('All collections are dropped !!! \n'));
      } catch (error) {
        console.error(chalk.red('ERROR in Drop Collections'), error);
        throw `Error in Drop Collections`;
      }
    }

    // Seed initial collection
    if (argv.includes('--seed')) {
      console.log('------------------------------------------------------------ ');
      // ! seeding order is important (Don't Use "no-await-in-loop")
      for (const seeder of seeders) {
        try {
          const start = Date.now();
          // const message = await require(`./seed/${seeder}-seed`).seed();
          const message = await (await import(`./seed/${seeder}-seed`)).seed();
          console.log(`seed > ${seeder} complete >> [${Math.floor(Date.now() - start)} ms] ${message}`);
        } catch (error) {
          console.error(`ERROR in seeding ${seeder}: `, error);
          throw `Error in Seeding ${seeder}`;
        }
      }
      console.log(chalk.green(`Seeding >>> Completed:  ${seeders.join('; ')} \n`));
    }

    // (argv) data
    const fakers = factory(argv);
    console.log('------------------------------------------------------------ ');
    for (const [faker, ...args] of fakers) {
      try {
        const start = Date.now();
        // const message = await require(`./factory/${faker}-factory`).fake(...args);
        const message = await (await import(`./factory/${faker}-factory`)).fake(...args);

        console.log(`factory > ${faker} complete >>[${Math.floor(Date.now() - start)} ms] ${message}`);
      } catch (error) {
        console.error(`ERROR in factory ${faker}: `, error);
        throw `Error in Factory ${faker}`;
      }
    }
    console.log(chalk.green(`Factory >>> Completed:  ${fakers.join('; ')} \n`));

    // migrate data
    if (argv.includes('--migrate')) {
      console.log('------------------------------------------------------------ ');

      const migrated = await Migration.find();
      const migratedFiles: string[] = [];

      const files = await fsPromises.readdir(path.join(__dirname, 'migration'), { withFileTypes: true });
      for (const file of files) {
        // migrate if it is not done so
        if (!migrated.find(m => m.file === file.name)) {
          try {
            // const message = await require(`./migration/${file.name}`).proceed();
            const message = await (await import(`./migration/${file.name}`)).proceed();

            console.log(`migration > ${file.name} complete >> ${message}`);
            await Migration.create<Partial<MigrationDocument>>({ file: file.name });
            migratedFiles.push(file.name);
          } catch (error) {
            console.error(
              `${chalk.red('FAIL to migrate')} ${file.name}. ${chalk.yellow('Trying to roll back')}:`,
              error,
            );

            try {
              // const message = await require(`./migration/${file.name}`).rollback();
              const message = await (await import(`./migration/${file.name}`)).rollback();

              console.log(`migration > ${file.name} ${chalk.red('RESTORED')} >> ${message}`);
              throw `Error in Migration (rollback successful) ${file.name}`;
            } catch (error) {
              console.error(`${chalk.red('ERROR in migration ROLL-BACK')} ${file.name}: `, error);
              throw `Error in Migration (fail to rollback) ${file.name}`;
            }
          }
        }
      }
      console.log(chalk.green(`Migration >>> success:  (${migratedFiles.length}) ${migratedFiles}   \n`));
    }
  } catch (error) {
    console.log(error);
    console.error(chalk.red('\n\nDatabase Management FAIL ....................', error, '\n\n'));
    throw error;
  } finally {
    await mongoose.connection.close();
    console.timeEnd('database init');
  }
};

// For command line operation, pass in arguments
const argv = process.argv.slice(2); // pass in arguments, remove 1st two element

if (argv) {
  sync(argv)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default sync;
