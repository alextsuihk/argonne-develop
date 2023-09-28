/**
 * Model: PresignedUrl
 *
 * track upload (put) presignedUrl, remove object if not validateObject()
 */

import type { Document, Types } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import { baseDefinition } from './common';

export interface PresignedUrlDocument extends Document {
  user: Types.ObjectId;
  url: string;
  expireAt: Date;
}

const { DEFAULTS } = configLoader;

const presignedUrlSchema = new Schema<PresignedUrlDocument>(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    url: String,
    expireAt: { type: Date, index: true }, // need to manually remove minio upload, cannot use mongo built-in auto-delete
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const PresignedUrl = model<PresignedUrlDocument>('PresignedUrl', presignedUrlSchema);

export default PresignedUrl;
