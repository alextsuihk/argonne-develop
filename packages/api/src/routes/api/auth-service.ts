/**
 * Route: auth
 *
 */

import { Router } from 'express';

import authController from '../../controllers/auth-service';

const router = Router();

/**
 * @route   POST api/user-info
 * @desc    get basic user info based on email & password
 */
router.post('/', authController.userBasicInfo);

export default router;
