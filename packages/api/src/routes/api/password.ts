/**
 * Route: Passwords
 *
 * password management
 */

import { Router } from 'express';

import passwordController from '../../controllers/password';

const router = Router();

/**
 * @route   POST api/password/:action
 * @desc    POST change user password
 */
router.post('/:action', passwordController.postHandler);

export default router;
