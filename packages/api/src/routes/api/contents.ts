/**
 * Route: Content
 *
 *
 */

import { Router } from 'express';

import contentController from '../../controllers/content';

const router = Router();
const { findMany } = contentController;

/**
 * @route   GET api/contents
 * @desc    get all chats info (querystring might apply)
 */
router.get('/:token', findMany);

export default router;
