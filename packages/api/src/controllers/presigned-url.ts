/**
 * Controller: PresignedUrl (Minio)
 *
 */

import { yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';

import type { PresignedUrl } from '../utils/storage';
import storage from '../utils/storage';
import common from './common';

const { auth } = common;
const { presignedUrlSchema } = yupSchema;

/**
 * Create Presigned URL (for upload)
 */
const create = async (req: Request, args: unknown): Promise<PresignedUrl> => {
  const { userId } = auth(req);
  const { bucketType, ext } = await presignedUrlSchema.validate(args);

  return storage.presignedPutObject(bucketType, ext, userId);
};

/**
 * Create a Presigned URL (RESTful)
 */
const createNew: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ data: await create(req, req.body) });
  } catch (error) {
    next(error);
  }
};

export default { create, createNew };
