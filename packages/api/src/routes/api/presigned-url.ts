/**
 * Route: Presigned-Urls
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import presignedUrlController from '../../controllers/presigned-url';

const router = Router();
const { createNew } = presignedUrlController;

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   POST api/uploads
   * @desc    generate a presigned URL for client uploading file
   */
  router.post('/', createNew);
}

export default router;
