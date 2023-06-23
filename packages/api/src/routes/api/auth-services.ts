/**
 * Route: auth
 *
 */

import { Router } from 'express';

import authController from '../../controllers/auth-service';

const router = Router();

/**
 * @route   GET api/user-info
 * @desc    get basic user info based authorization token
 */
router.get('/:client', authController.userInfo);

/**
 * @route   POST api/user-info
 * @desc    get basic user info based authorization token
 */
router.post('/', authController.userInfo);

export default router;
