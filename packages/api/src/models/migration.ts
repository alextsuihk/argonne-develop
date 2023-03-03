/**
 * Model: Migration
 *
` * inspired by Laravel database migration.
` * ! Mongo is schema-less. This utility is migrate DATA in database, NOT schema
 *
 */

import mongoose, { Document, Schema } from 'mongoose';

import configLoader from '../config/config-loader';

export interface MigrationDocument extends Document {
  file: string;
  migratedAt: Date;
}

const { DEFAULTS } = configLoader;

const migrationSchema = new Schema<MigrationDocument>(
  {
    file: String,
    migratedAt: { type: Date, default: Date.now },
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

export default mongoose.model<MigrationDocument>('Migration', migrationSchema);
