/**
 * Route: Users
 *
 */

import { Router } from 'express';

import userController from '../../controllers/user';

const { createNew, findMany, findOneById, updateAction } = userController;

const router = Router();

/**
 * @route   GET api/users/
 * @desc    get All Users

 */
router.get('/', findMany);

/**
 * @route   GET api/users/:id
 * @desc    get a single user detail
 */
router.get('/:id', findOneById);

/**
 * @route   POST api/users
 * @desc    add a new user (by tenantAdmin, root), or check isEmailAvailable
 */
router.post('/:action?', createNew);

/**
 * @route   PATCH api/users/:id/:action?
 * @desc    tenantAdmin (school only) & user himself could update
 *
 */
router.patch('/:id/:action?', updateAction);

export default router;
