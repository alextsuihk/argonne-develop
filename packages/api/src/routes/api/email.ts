/**
 * Route: Email
 *
 * email management
 */

import { Router } from 'express';

import emailController from '../../controllers/emails';

const router = Router();

/**
 * @route   POST api/email/:email/:action
 * @desc    POST change user email
 */
router.post('/:action', emailController.postHandler);

export default router;
