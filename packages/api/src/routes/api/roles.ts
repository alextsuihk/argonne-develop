/**
 * Route: Users
 *
 * add & remove user's role
 */

import { Router } from 'express';

import roleController from '../../controllers/role';

const { addById, findOneById, removeById } = roleController;
const router = Router();

/**
 * @route   GET api/roles/:id
 * @desc    get roles of an user
 */
router.get('/:id', findOneById);

/**
 * @route   post api/roles/:id
 * @desc    add a role
 *
 */
router.post('/:id', addById);

/**
 * @route   delete api/roles/:id
 * @desc    remove a role
 *
 */
router.delete('/:id', removeById);
export default router;
