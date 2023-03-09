/**
 * Route: Presigned-Urls
 *
 */

import { Router } from 'express';

import presignedUrlController from '../../controllers/presigned-url';

const router = Router();
const { createNew } = presignedUrlController;

/**
 * @route   POST api/uploads
 * @desc    generate a presigned URL for client uploading file
 */
router.post('/', createNew);

export default router;
