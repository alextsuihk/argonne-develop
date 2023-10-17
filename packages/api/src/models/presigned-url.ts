/**
 * Model: PresignedUrl
 *
 * track upload (put) presignedUrl, remove object if not validateObject()
 */

import type { InferSchemaType } from 'mongoose';
import { model, Schema } from 'mongoose';

import configLoader from '../config/config-loader';
import type { Id } from './common';
import { baseDefinition } from './common';

const { DEFAULTS } = configLoader;

const presignedUrlSchema = new Schema(
  {
    ...baseDefinition,

    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true },
    expireAt: { type: Date, required: true, index: true }, // need to manually remove minio upload as well, cannot use mongo built-in auto-delete
  },
  DEFAULTS.MONGOOSE.SCHEMA_OPTS,
);

const PresignedUrl = model('PresignedUrl', presignedUrlSchema);
export type PresignedUrlDocument = InferSchemaType<typeof presignedUrlSchema> & Id;
export default PresignedUrl;
