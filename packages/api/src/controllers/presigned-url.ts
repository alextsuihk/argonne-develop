/**
 * Controller: PresignedUrl (Minio)
 *
 */

import { LOCALE, yupSchema } from '@argonne/common';
import type { Request, RequestHandler } from 'express';

import type { PresignedUrlWithExpiry } from '../utils/storage';
import storage from '../utils/storage';
import common from './common';

const { MSG_ENUM } = LOCALE;
const { auth } = common;
const { presignedUrlSchema } = yupSchema;

/**
 * Create Presigned URL (for upload)
 */
const create = async (req: Request, args: unknown): Promise<PresignedUrlWithExpiry> => {
  const { userId } = auth(req);
  const { bucketType, ext } = await presignedUrlSchema.validate(args);

  switch (bucketType) {
    case 'private':
      return storage.presignedPutObject('private', ext, userId);
    case 'public':
      return storage.presignedPutObject('public', ext, userId);
    default:
      throw { statusCode: 422, code: MSG_ENUM.USER_INPUT_ERROR };
  }
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
