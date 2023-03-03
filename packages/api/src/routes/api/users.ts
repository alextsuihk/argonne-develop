/**
 * Route: Users
 *
 */

import { Router } from 'express';

import configLoader from '../../config/config-loader';
import userController from '../../controllers/user';

const { createNew, findMany, findOneById, getAction, updateAction } = userController;

const router = Router();

/**
 * @route   GET api/admin/users/
 * @desc    get All Users

 */
router.get('/admin', findMany);

/**
 * @route   GET api/admin/users/:id
 * @desc    get a single user detail
 */
router.get('/admin/:id', findOneById);

if (configLoader.config.restfulFullAccess) {
  /**
   * @route   GET api/users/:action/:extra
   * @desc    additional functions
   */
  router.get('/:action/:extra?/:extra2?', getAction);

  /**
   * @route   POST api/users
   * @desc    add a new user (by tenantAdmin)
   */
  router.post('/', createNew);

  /**
   * @route   PATCH api/users/:id/:action?
   * @desc    tenantAdmin (school only) & user himself could update
   *
   */
  router.patch('/:id/:action?', updateAction);
}
export default router;
