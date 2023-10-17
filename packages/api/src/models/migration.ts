/**
 * Model: Migration
 *
` * inspired by Laravel database migration.
` * ! Mongo is schema-less. This utility is migrate DATA in database, NOT schema
 *
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';

const { DEFAULTS } = configLoader;

const migrationSchema = new Schema(
  {
    file: { type: String, required: true },
    migratedAt: { type: Date },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const Migration = model('Migration', migrationSchema);
export type MigrationDocument = InferSchemaType<typeof migrationSchema> & Id;
export default Migration;
